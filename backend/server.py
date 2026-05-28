from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import subprocess
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'voucherverse-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# ===================== MULTI-SITE / ORDER PREFIX HELPERS =====================
# Each frontend site sends "X-Site-Id" header. Backend looks up site_configs
# collection to determine: (a) prefix for order_id generation, and (b) forward
# URLs for proxy callback routing (Ayolinx/DigiFlazz webhooks).
# Order ID format: LLLYYYYMMDDHHMMSSXXXX  (e.g. NEO20260416070531D54F)
# - LLL = 3-letter site prefix (uppercased)
# - YYYYMMDDHHMMSS = local timestamp (14 digits)
# - XXXX = 4 hex chars (uppercase) from uuid4

DEFAULT_SITE_PREFIX = "BLZ"


def get_site_id_from_request(request: Optional[Request]) -> str:
    """Extract X-Site-Id header (case-insensitive). Returns 'default' if absent."""
    if request is None:
        return "default"
    return (
        request.headers.get("X-Site-Id")
        or request.headers.get("x-site-id")
        or "default"
    )


async def get_site_config(site_id: str) -> dict:
    """Lookup site config by site_id. Returns sane default if not found."""
    if site_id and site_id != "default":
        config = await db.site_configs.find_one({"site_id": site_id}, {"_id": 0})
        if config:
            return config
    # Fallback: return the BLZ/blaze default
    config = await db.site_configs.find_one({"site_id": "blaze"}, {"_id": 0})
    if config:
        return config
    return {
        "site_id": "blaze",
        "prefix": DEFAULT_SITE_PREFIX,
        "brand_name": "BlazeStore",
        "process_locally": True,
        "forward_url_qris": None,
        "forward_url_va": None,
        "forward_url_digiflazz": None,
        "active": True,
    }


async def get_prefix_for_site(site_id: str) -> str:
    """Get the 3-letter order prefix for the given site_id."""
    config = await get_site_config(site_id)
    return (config.get("prefix") or DEFAULT_SITE_PREFIX).upper()[:3]


def generate_order_id(prefix: str) -> str:
    """Generate order id: PREFIX + YYYYMMDDHHMMSS + 4-hex.
    Total: 3 + 14 + 4 = 21 chars.
    """
    prefix = (prefix or DEFAULT_SITE_PREFIX).upper()[:3].ljust(3, "X")
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = uuid.uuid4().hex[:4].upper()
    return f"{prefix}{timestamp}{random_part}"


async def new_order_id_for_request(request: Optional[Request]) -> str:
    """One-shot helper used by order-create endpoints."""
    site_id = get_site_id_from_request(request)
    prefix = await get_prefix_for_site(site_id)
    return generate_order_id(prefix)


async def lookup_site_by_prefix(prefix: str) -> Optional[dict]:
    """Find a site config by its order prefix (used by callback forwarder)."""
    if not prefix:
        return None
    config = await db.site_configs.find_one(
        {"prefix": prefix.upper(), "active": True}, {"_id": 0}
    )
    return config


# ===================== INTEGRATION SETTINGS HELPERS =====================
# DB-first, env-fallback for Ayolinx & DigiFlazz credentials.

INTEGRATION_ENV_MAP = {
    "ayolinx": {
        "client_key": "AYOLINX_CLIENT_KEY",
        "client_secret": "AYOLINX_CLIENT_SECRET",
        "customer_no": "AYOLINX_CUSTOMER_NO",
        # PEM content pasted by admin (DB-only; no env var counterpart)
        "private_key_pem": None,
        "public_key_pem": None,
        # File paths still supported for env-side fallback
        "private_key_path": "AYOLINX_PRIVATE_KEY_PATH",
        "public_key_path": "AYOLINX_PUBLIC_KEY_PATH",
        "mode": "AYOLINX_MODE",  # sandbox|production
    },
    "digiflazz": {
        "username": "DIGIFLAZZ_USERNAME",
        "api_key": "DIGIFLAZZ_API_KEY",
        "webhook_secret": "DIGIFLAZZ_WEBHOOK_SECRET",
        "webhook_id": "DIGIFLAZZ_WEBHOOK_ID",
        "mode": "DIGIFLAZZ_MODE",  # development|production
    },
}


async def get_integration_config(service: str) -> dict:
    """Return resolved config for a service: DB override > env value."""
    service = service.lower()
    if service not in INTEGRATION_ENV_MAP:
        return {}
    db_doc = await db.integration_settings.find_one({"service": service}, {"_id": 0}) or {}
    db_cfg = db_doc.get("config", {})
    result = {}
    for key, env_name in INTEGRATION_ENV_MAP[service].items():
        env_val = os.environ.get(env_name, "") if env_name else ""
        result[key] = db_cfg.get(key) or env_val
    result["_source"] = {
        k: ("db" if db_cfg.get(k) else "env")
        for k in INTEGRATION_ENV_MAP[service].keys()
    }
    return result


def mask_secret(value: str) -> str:
    """Return a masked version of a secret for safe display."""
    if not value:
        return ""
    if len(value) <= 8:
        return "•" * len(value)
    return f"{value[:4]}{'•' * (len(value) - 8)}{value[-4:]}"



# Create the main app
app = FastAPI(title="VoucherVerse API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ===================== MODELS =====================

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    role: str = "user"  # user, reseller, admin
    balance: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ResellerApplication(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    status: str = "pending"  # pending, approved, rejected
    phone: str
    business_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ResellerApplyRequest(BaseModel):
    phone: str
    business_name: Optional[str] = None

class Denomination(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: int  # e.g., 86 diamonds
    price: float  # regular price
    reseller_price: float  # reseller price

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    category: str  # game, voucher, ppob
    image: str
    banner_image: Optional[str] = None
    description: str
    instructions: str
    input_fields: List[str] = ["user_id"]  # user_id, server_id, etc.
    denominations: List[Denomination] = []
    is_active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    slug: str
    category: str
    image: str
    banner_image: Optional[str] = None
    description: str
    instructions: str
    input_fields: List[str] = ["user_id"]
    denominations: List[dict] = []

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: f"VV{datetime.now().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4].upper()}")
    user_id: Optional[str] = None
    user_email: str
    product_id: str
    product_name: str
    denomination_name: str
    denomination_amount: int
    price: float
    game_user_id: str
    game_server_id: Optional[str] = None
    payment_method: str
    status: str = "pending"  # pending, processing, completed, failed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    completed_at: Optional[str] = None

class OrderCreate(BaseModel):
    product_id: str
    denomination_id: str
    game_user_id: str
    game_server_id: Optional[str] = None
    email: str
    payment_method: str

class DigiFlazzOrderCreate(BaseModel):
    brand: str
    sku_code: str
    product_name: str
    game_user_id: str
    game_server_id: Optional[str] = None
    email: str
    payment_method: str
    price: float

class TopUpBalance(BaseModel):
    amount: float

class TransactionTrack(BaseModel):
    order_number: str

# ===================== AUTH HELPERS =====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def get_reseller_user(user: dict = Depends(get_current_user)):
    if user.get("role") not in ["reseller", "admin"]:
        raise HTTPException(status_code=403, detail="Reseller access required")
    return user

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register")
async def register(data: UserCreate):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=data.email,
        name=data.name,
        role="user"
    )
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(data.password)
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id, user.role)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "balance": user.balance
        }
    }

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"],
            "balance": user.get("balance", 0)
        }
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"user": user}

# ===================== PRODUCTS ROUTES =====================

@api_router.get("/products")
async def get_products(category: Optional[str] = None):
    query = {"is_active": True}
    if category:
        query["category"] = category
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return {"products": products}

@api_router.get("/products/{slug}")
async def get_product(slug: str):
    product = await db.products.find_one({"slug": slug, "is_active": True}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"product": product}

# ===================== ORDERS ROUTES =====================

@api_router.post("/orders")
async def create_order(data: OrderCreate, request: Request, user: Optional[dict] = None):
    # Get product
    product = await db.products.find_one({"id": data.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Find denomination
    denomination = None
    for d in product.get("denominations", []):
        if d["id"] == data.denomination_id:
            denomination = d
            break
    
    if not denomination:
        raise HTTPException(status_code=404, detail="Denomination not found")
    
    # Check if user is reseller for pricing
    price = denomination["price"]
    if user and user.get("role") == "reseller":
        price = denomination.get("reseller_price", denomination["price"])
    
    # Generate prefixed order_id (e.g. NEO20260416070531D54F)
    oid = await new_order_id_for_request(request)

    order = Order(
        id=oid,
        order_number=oid,
        user_id=user["id"] if user else None,
        user_email=data.email,
        product_id=product["id"],
        product_name=product["name"],
        denomination_name=denomination["name"],
        denomination_amount=denomination["amount"],
        price=price,
        game_user_id=data.game_user_id,
        game_server_id=data.game_server_id,
        payment_method=data.payment_method
    )
    
    await db.orders.insert_one(order.model_dump())
    
    return {"order": order.model_dump()}

@api_router.post("/orders/guest")
async def create_guest_order(data: OrderCreate, request: Request):
    return await create_order(data, request, None)

@api_router.post("/orders/authenticated")
async def create_authenticated_order(data: OrderCreate, request: Request, user: dict = Depends(get_current_user)):
    return await create_order(data, request, user)

@api_router.post("/orders/digiflazz")
async def create_digiflazz_order(data: DigiFlazzOrderCreate, request: Request):
    """Create order for DigiFlazz products (not in seed DB)"""
    # Generate prefixed order_id
    oid = await new_order_id_for_request(request)

    order = Order(
        id=oid,
        order_number=oid,
        user_id=None,
        user_email=data.email,
        product_id=f"df-{data.brand}",
        product_name=data.brand,
        denomination_name=data.product_name,
        denomination_amount=0,
        price=data.price,
        game_user_id=data.game_user_id,
        game_server_id=data.game_server_id,
        payment_method=data.payment_method,
    )
    order_dict = order.model_dump()
    order_dict["digiflazz_sku"] = data.sku_code
    order_dict["digiflazz_customer_no"] = f"{data.game_user_id}{data.game_server_id}" if data.game_server_id else data.game_user_id
    await db.orders.insert_one(order_dict)
    return {"order": {k: v for k, v in order_dict.items() if k != "_id"}}


@api_router.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"order": order}

@api_router.get("/orders/my")
async def get_my_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"user_id": user["id"]}, 
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"orders": orders}

# ===================== PAYMENT SIMULATION (MOCK) =====================

@api_router.post("/payment/process/{order_id}")
async def process_payment(order_id: str):
    """Mock payment processing - simulates successful payment"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Simulate payment success
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "completed",
            "completed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Get updated order
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return {"order": updated_order, "message": "Payment processed successfully"}

# ===================== RESELLER ROUTES =====================

RESELLER_PLANS = {
    "pro": {"name": "Pro", "monthly": 99000, "yearly": 799000},
    "legend": {"name": "Legend", "monthly": 199000, "yearly": 1599000},
    "supreme": {"name": "Supreme", "monthly": 349000, "yearly": 2799000},
}

class ResellerSubscribeRequest(BaseModel):
    plan: str  # pro, legend, supreme
    period: str  # monthly, yearly
    phone: str
    business_name: Optional[str] = None

@api_router.post("/reseller/subscribe")
async def reseller_subscribe(data: ResellerSubscribeRequest, request: Request, user: dict = Depends(get_current_user)):
    """Create reseller subscription payment via Ayolinx"""
    plan = RESELLER_PLANS.get(data.plan)
    if not plan:
        raise HTTPException(status_code=400, detail="Invalid plan")
    if data.period not in ("monthly", "yearly"):
        raise HTTPException(status_code=400, detail="Invalid period")

    amount = plan[data.period]
    # Use site prefix (e.g. NEO20260416070531D54F) — replaces old RSL-uuid format.
    order_id = await new_order_id_for_request(request)

    # Save subscription intent
    sub = {
        "id": order_id,
        "user_id": user["id"],
        "user_email": user["email"],
        "plan": data.plan,
        "plan_name": plan["name"],
        "period": data.period,
        "amount": amount,
        "phone": data.phone,
        "business_name": data.business_name,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reseller_subscriptions.insert_one(sub)

    return {"subscription": {k: v for k, v in sub.items() if k != "_id"}, "order_id": order_id, "amount": amount}

@api_router.get("/reseller/subscription")
async def get_reseller_subscription(user: dict = Depends(get_current_user)):
    """Get current user's reseller subscription status"""
    sub = await db.reseller_subscriptions.find_one(
        {"user_id": user["id"]},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    return {"subscription": sub}

@api_router.post("/reseller/activate-callback")
async def reseller_activate_callback(payload: dict):
    """Called internally or via webhook when reseller payment succeeds"""
    order_id = payload.get("order_id", "")
    sub = await db.reseller_subscriptions.find_one({"id": order_id}, {"_id": 0})
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if sub.get("status") == "active":
        return {"message": "Already active"}

    period_days = 365 if sub["period"] == "yearly" else 30
    expires_at = (datetime.now(timezone.utc) + timedelta(days=period_days)).isoformat()

    await db.reseller_subscriptions.update_one(
        {"id": order_id},
        {"$set": {"status": "active", "activated_at": datetime.now(timezone.utc).isoformat(), "expires_at": expires_at}}
    )

    # Upgrade user role to reseller
    await db.users.update_one(
        {"id": sub["user_id"]},
        {"$set": {"role": "reseller", "reseller_plan": sub["plan"], "reseller_expires": expires_at}}
    )

    return {"message": "Reseller activated", "plan": sub["plan"], "expires_at": expires_at}

@api_router.get("/reseller/plans")
async def get_reseller_plans():
    """Get available reseller plans"""
    return {"plans": RESELLER_PLANS}

@api_router.post("/reseller/apply")
async def apply_reseller(data: ResellerApplyRequest, user: dict = Depends(get_current_user)):
    if user["role"] == "reseller":
        raise HTTPException(status_code=400, detail="You are already a reseller")
    
    existing = await db.reseller_applications.find_one({"user_id": user["id"], "status": "pending"})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending application")
    
    application = ResellerApplication(
        user_id=user["id"],
        phone=data.phone,
        business_name=data.business_name
    )
    
    await db.reseller_applications.insert_one(application.model_dump())
    return {"application": application.model_dump(), "message": "Application submitted successfully"}

@api_router.get("/reseller/dashboard")
async def reseller_dashboard(user: dict = Depends(get_reseller_user)):
    # Get reseller stats
    orders = await db.orders.find({"user_id": user["id"]}).to_list(1000)
    
    total_sales = sum(o.get("price", 0) for o in orders if o.get("status") == "completed")
    total_orders = len(orders)
    pending_orders = len([o for o in orders if o.get("status") == "pending"])
    
    return {
        "balance": user.get("balance", 0),
        "total_sales": total_sales,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "recent_orders": orders[:10]
    }

@api_router.post("/reseller/topup")
async def reseller_topup(data: TopUpBalance, user: dict = Depends(get_reseller_user)):
    """Mock balance top-up for resellers"""
    new_balance = user.get("balance", 0) + data.amount
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"balance": new_balance}}
    )
    return {"balance": new_balance, "message": f"Successfully added {data.amount} to balance"}

# ===================== RESELLER STORE =====================

class StoreConfigUpdate(BaseModel):
    store_name: Optional[str] = None
    subdomain: Optional[str] = None
    logo_url: Optional[str] = None
    template: Optional[str] = None  # blaze, minimal, gaming
    markup_type: Optional[str] = None  # percent, fixed
    markup_value: Optional[float] = None
    ayolinx_client_key: Optional[str] = None
    ayolinx_client_secret: Optional[str] = None
    ayolinx_customer_no: Optional[str] = None

@api_router.get("/reseller/store")
async def get_store_config(user: dict = Depends(get_reseller_user)):
    """Get reseller store configuration"""
    store = await db.reseller_stores.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"store": store}

@api_router.put("/reseller/store")
async def update_store_config(data: StoreConfigUpdate, user: dict = Depends(get_reseller_user)):
    """Update reseller store settings"""
    update = {}
    for field in ["store_name", "logo_url", "template", "markup_type", "markup_value",
                   "ayolinx_client_key", "ayolinx_client_secret", "ayolinx_customer_no"]:
        val = getattr(data, field, None)
        if val is not None:
            update[field] = val

    # Subdomain: validate uniqueness
    if data.subdomain:
        slug = data.subdomain.lower().strip().replace(" ", "-")
        existing = await db.reseller_stores.find_one({"subdomain": slug, "user_id": {"$ne": user["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Subdomain sudah dipakai")
        update["subdomain"] = slug

    if not update:
        raise HTTPException(status_code=400, detail="Nothing to update")

    update["user_id"] = user["id"]
    update["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.reseller_stores.update_one(
        {"user_id": user["id"]},
        {"$set": update, "$setOnInsert": {"created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True
    )
    store = await db.reseller_stores.find_one({"user_id": user["id"]}, {"_id": 0})
    return {"store": store}

@api_router.get("/store/{subdomain}")
async def get_public_store(subdomain: str):
    """Public endpoint: get reseller store by subdomain (for namatoko.blazestore.id)"""
    store = await db.reseller_stores.find_one({"subdomain": subdomain.lower()}, {"_id": 0})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")

    # Get reseller user info
    reseller = await db.users.find_one({"id": store["user_id"]}, {"_id": 0, "password": 0})

    # Hide sensitive Ayolinx keys from public
    public_store = {k: v for k, v in store.items() if not k.startswith("ayolinx_client_secret")}
    public_store["has_own_payment"] = bool(store.get("ayolinx_client_key"))
    public_store["reseller_name"] = reseller.get("name", "") if reseller else ""
    public_store["reseller_plan"] = reseller.get("reseller_plan", "") if reseller else ""

    return {"store": public_store}

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/dashboard")
async def admin_dashboard(user: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({})
    total_orders = await db.orders.count_documents({})
    total_products = await db.products.count_documents({})
    pending_applications = await db.reseller_applications.count_documents({"status": "pending"})
    
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    
    # Calculate revenue
    completed_orders = await db.orders.find({"status": "completed"}, {"_id": 0}).to_list(1000)
    total_revenue = sum(o.get("price", 0) for o in completed_orders)
    
    return {
        "total_users": total_users,
        "total_orders": total_orders,
        "total_products": total_products,
        "pending_applications": pending_applications,
        "total_revenue": total_revenue,
        "recent_orders": recent_orders
    }

@api_router.get("/admin/users")
async def admin_get_users(user: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return {"users": users}

@api_router.get("/admin/orders")
async def admin_get_orders(user: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0, "payment_callback_raw": 0, "digiflazz_raw": 0, "digiflazz_response": 0, "payment_data": 0}).sort("created_at", -1).to_list(200)
    return {"orders": orders}

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status: str, user: dict = Depends(get_admin_user)):
    if status not in ["pending", "processing", "paid", "completed", "failed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update_data = {"status": status}
    if status == "completed":
        update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order status updated"}

@api_router.get("/admin/products")
async def admin_get_products(user: dict = Depends(get_admin_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(100)
    return {"products": products}

@api_router.post("/admin/products")
async def admin_create_product(data: ProductCreate, user: dict = Depends(get_admin_user)):
    # Process denominations
    denominations = []
    for d in data.denominations:
        denom = Denomination(
            name=d.get("name", ""),
            amount=d.get("amount", 0),
            price=d.get("price", 0),
            reseller_price=d.get("reseller_price", d.get("price", 0))
        )
        denominations.append(denom.model_dump())
    
    product = Product(
        name=data.name,
        slug=data.slug,
        category=data.category,
        image=data.image,
        banner_image=data.banner_image,
        description=data.description,
        instructions=data.instructions,
        input_fields=data.input_fields,
        denominations=denominations
    )
    
    await db.products.insert_one(product.model_dump())
    return {"product": product.model_dump()}

@api_router.put("/admin/products/{product_id}")
async def admin_update_product(product_id: str, data: ProductCreate, user: dict = Depends(get_admin_user)):
    # Process denominations
    denominations = []
    for d in data.denominations:
        denom = Denomination(
            name=d.get("name", ""),
            amount=d.get("amount", 0),
            price=d.get("price", 0),
            reseller_price=d.get("reseller_price", d.get("price", 0))
        )
        denominations.append(denom.model_dump())
    
    update_data = {
        "name": data.name,
        "slug": data.slug,
        "category": data.category,
        "image": data.image,
        "banner_image": data.banner_image,
        "description": data.description,
        "instructions": data.instructions,
        "input_fields": data.input_fields,
        "denominations": denominations
    }
    
    result = await db.products.update_one({"id": product_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product updated"}

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, user: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@api_router.get("/admin/reseller-applications")
async def admin_get_reseller_applications(user: dict = Depends(get_admin_user)):
    applications = await db.reseller_applications.find({}, {"_id": 0}).to_list(100)
    
    # Enrich with user info
    for app in applications:
        user_info = await db.users.find_one({"id": app["user_id"]}, {"_id": 0, "password": 0})
        app["user"] = user_info
    
    return {"applications": applications}

@api_router.put("/admin/reseller-applications/{app_id}/approve")
async def admin_approve_reseller(app_id: str, user: dict = Depends(get_admin_user)):
    app = await db.reseller_applications.find_one({"id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    # Update application status
    await db.reseller_applications.update_one(
        {"id": app_id},
        {"$set": {"status": "approved"}}
    )
    
    # Update user role
    await db.users.update_one(
        {"id": app["user_id"]},
        {"$set": {"role": "reseller"}}
    )
    
    return {"message": "Reseller approved"}

@api_router.put("/admin/reseller-applications/{app_id}/reject")
async def admin_reject_reseller(app_id: str, user: dict = Depends(get_admin_user)):
    result = await db.reseller_applications.update_one(
        {"id": app_id},
        {"$set": {"status": "rejected"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Application not found")
    
    return {"message": "Reseller rejected"}

# ===================== SEED DATA =====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial products data"""
    
    # Check if already seeded
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    products = [
        {
            "name": "Mobile Legends",
            "slug": "mobile-legends",
            "category": "game",
            "image": "https://ui-avatars.com/api/?name=ML&background=4267B2&color=fff&size=200&bold=true&font-size=0.4",
            "banner_image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
            "description": "Top up Diamond Mobile Legends dengan harga termurah dan proses instant!",
            "instructions": "Masukkan User ID dan Zone ID untuk melakukan top up",
            "input_fields": ["user_id", "server_id"],
            "denominations": [
                {"name": "86 Diamonds", "amount": 86, "price": 19000, "reseller_price": 18000},
                {"name": "172 Diamonds", "amount": 172, "price": 38000, "reseller_price": 36000},
                {"name": "257 Diamonds", "amount": 257, "price": 57000, "reseller_price": 54000},
                {"name": "344 Diamonds", "amount": 344, "price": 76000, "reseller_price": 72000},
                {"name": "514 Diamonds", "amount": 514, "price": 114000, "reseller_price": 108000},
                {"name": "706 Diamonds", "amount": 706, "price": 152000, "reseller_price": 144000},
            ]
        },
        {
            "name": "Free Fire",
            "slug": "free-fire",
            "category": "game",
            "image": "https://ui-avatars.com/api/?name=FF&background=FF6B00&color=fff&size=200&bold=true&font-size=0.4",
            "banner_image": "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800",
            "description": "Top up Diamond Free Fire instant dan murah!",
            "instructions": "Masukkan Player ID untuk melakukan top up",
            "input_fields": ["user_id"],
            "denominations": [
                {"name": "70 Diamonds", "amount": 70, "price": 10000, "reseller_price": 9500},
                {"name": "140 Diamonds", "amount": 140, "price": 20000, "reseller_price": 19000},
                {"name": "355 Diamonds", "amount": 355, "price": 50000, "reseller_price": 47500},
                {"name": "720 Diamonds", "amount": 720, "price": 100000, "reseller_price": 95000},
            ]
        },
        {
            "name": "PUBG Mobile",
            "slug": "pubg-mobile",
            "category": "game",
            "image": "https://play-lh.googleusercontent.com/JRd05pyBH41qjgsJuWduRJpDeZG0Hnb0yjf2nWqO7VaGKL10-G5UIygxED-WNOc3pg=w240-h480-rw",
            "banner_image": "https://images.unsplash.com/photo-1560253023-3ec5d502959f?w=800",
            "description": "Top up UC PUBG Mobile dengan harga terbaik!",
            "instructions": "Masukkan Player ID untuk melakukan top up",
            "input_fields": ["user_id"],
            "denominations": [
                {"name": "60 UC", "amount": 60, "price": 15000, "reseller_price": 14000},
                {"name": "325 UC", "amount": 325, "price": 75000, "reseller_price": 71000},
                {"name": "660 UC", "amount": 660, "price": 150000, "reseller_price": 142000},
                {"name": "1800 UC", "amount": 1800, "price": 375000, "reseller_price": 356000},
            ]
        },
        {
            "name": "Genshin Impact",
            "slug": "genshin-impact",
            "category": "game",
            "image": "https://ui-avatars.com/api/?name=GI&background=6366F1&color=fff&size=200&bold=true&font-size=0.4",
            "banner_image": "https://images.unsplash.com/photo-1614294148960-9aa740632a87?w=800",
            "description": "Top up Genesis Crystal Genshin Impact instant!",
            "instructions": "Masukkan UID dan pilih server untuk melakukan top up",
            "input_fields": ["user_id", "server_id"],
            "denominations": [
                {"name": "60 Genesis Crystals", "amount": 60, "price": 16000, "reseller_price": 15000},
                {"name": "330 Genesis Crystals", "amount": 330, "price": 79000, "reseller_price": 75000},
                {"name": "1090 Genesis Crystals", "amount": 1090, "price": 249000, "reseller_price": 236000},
                {"name": "2240 Genesis Crystals", "amount": 2240, "price": 479000, "reseller_price": 455000},
            ]
        },
        {
            "name": "Valorant",
            "slug": "valorant",
            "category": "game",
            "image": "https://ui-avatars.com/api/?name=VAL&background=FF4655&color=fff&size=200&bold=true&font-size=0.4",
            "banner_image": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800",
            "description": "Top up Valorant Points dengan harga terbaik!",
            "instructions": "Masukkan Riot ID untuk melakukan top up",
            "input_fields": ["user_id"],
            "denominations": [
                {"name": "125 VP", "amount": 125, "price": 15000, "reseller_price": 14000},
                {"name": "420 VP", "amount": 420, "price": 50000, "reseller_price": 47000},
                {"name": "700 VP", "amount": 700, "price": 80000, "reseller_price": 76000},
                {"name": "1375 VP", "amount": 1375, "price": 150000, "reseller_price": 142000},
            ]
        },
        {
            "name": "Honkai: Star Rail",
            "slug": "honkai-star-rail",
            "category": "game",
            "image": "https://ui-avatars.com/api/?name=HSR&background=9333EA&color=fff&size=200&bold=true&font-size=0.4",
            "banner_image": "https://images.unsplash.com/photo-1614294148960-9aa740632a87?w=800",
            "description": "Top up Oneiric Shard Honkai: Star Rail!",
            "instructions": "Masukkan UID dan pilih server untuk melakukan top up",
            "input_fields": ["user_id", "server_id"],
            "denominations": [
                {"name": "60 Oneiric Shard", "amount": 60, "price": 16000, "reseller_price": 15000},
                {"name": "330 Oneiric Shard", "amount": 330, "price": 79000, "reseller_price": 75000},
                {"name": "1090 Oneiric Shard", "amount": 1090, "price": 249000, "reseller_price": 236000},
            ]
        },
        {
            "name": "Steam Wallet",
            "slug": "steam-wallet",
            "category": "voucher",
            "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Steam_icon_logo.svg/512px-Steam_icon_logo.svg.png",
            "banner_image": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800",
            "description": "Voucher Steam Wallet Code IDR",
            "instructions": "Kode voucher akan dikirim ke email Anda",
            "input_fields": [],
            "denominations": [
                {"name": "IDR 45.000", "amount": 45000, "price": 47000, "reseller_price": 45000},
                {"name": "IDR 90.000", "amount": 90000, "price": 94000, "reseller_price": 90000},
                {"name": "IDR 120.000", "amount": 120000, "price": 125000, "reseller_price": 120000},
                {"name": "IDR 250.000", "amount": 250000, "price": 260000, "reseller_price": 250000},
            ]
        },
        {
            "name": "Google Play",
            "slug": "google-play",
            "category": "voucher",
            "image": "https://play-lh.googleusercontent.com/q8hxnbpJCYfHipSOG_5tZe5jK_89T6QIsqrEklvGpMFKH8b98pDHJf2tPcn2bxEN96ON=w240-h480-rw",
            "banner_image": "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=800",
            "description": "Voucher Google Play IDR",
            "instructions": "Kode voucher akan dikirim ke email Anda",
            "input_fields": [],
            "denominations": [
                {"name": "IDR 20.000", "amount": 20000, "price": 21000, "reseller_price": 20000},
                {"name": "IDR 50.000", "amount": 50000, "price": 52000, "reseller_price": 50000},
                {"name": "IDR 100.000", "amount": 100000, "price": 104000, "reseller_price": 100000},
                {"name": "IDR 150.000", "amount": 150000, "price": 156000, "reseller_price": 150000},
            ]
        },
    ]
    
    # Add UUIDs to denominations
    for product in products:
        product["id"] = str(uuid.uuid4())
        product["is_active"] = True
        product["created_at"] = datetime.now(timezone.utc).isoformat()
        for denom in product["denominations"]:
            denom["id"] = str(uuid.uuid4())
    
    await db.products.insert_many(products)
    
    # Create admin user
    admin = User(
        email="admin@voucherverse.com",
        name="Admin",
        role="admin"
    )
    admin_dict = admin.model_dump()
    admin_dict["password"] = hash_password("admin123")
    await db.users.insert_one(admin_dict)
    
    return {"message": "Data seeded successfully", "products_count": len(products)}

# ===================== ROOT ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "VoucherVerse API v1.0"}

@api_router.get("/server-ip")
async def get_server_ip():
    """Get outbound IP of this server (for DigiFlazz whitelist)"""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://api.ipify.org", timeout=5.0)
            return {"ip": resp.text.strip()}
    except:
        return {"ip": "unknown"}

@api_router.get("/migrate/fix-icon-urls")
async def fix_icon_urls():
    """Fix brand/payment icon URLs: convert preview URLs and upload paths to /icons/ path"""
    preview = "https://store-variant-test.preview.emergentagent.com"
    old_path = "/api/static/uploads/"
    new_path = "/icons/"
    fixed = 0

    async for ic in db.brand_icons.find({}):
        url = ic.get("icon", "")
        new_url = url
        if preview in new_url:
            new_url = new_url.replace(preview, "")
        if old_path in new_url:
            new_url = new_url.replace(old_path, new_path)
        if new_url != url:
            await db.brand_icons.update_one({"_id": ic["_id"]}, {"$set": {"icon": new_url}})
            fixed += 1

    async for ic in db.payment_icons.find({}):
        url = ic.get("icon", "")
        new_url = url
        if preview in new_url:
            new_url = new_url.replace(preview, "")
        if old_path in new_url:
            new_url = new_url.replace(old_path, new_path)
        if new_url != url:
            await db.payment_icons.update_one({"_id": ic["_id"]}, {"$set": {"icon": new_url}})
            fixed += 1

    return {"success": True, "fixed": fixed}

# ===================== CMS PAGES =====================

@api_router.get("/cms/{page_slug}")
async def get_cms_page(page_slug: str):
    """Get CMS page content (tentang-kami, kebijakan-privasi, syarat-ketentuan)"""
    page = await db.cms_pages.find_one({"slug": page_slug}, {"_id": 0})
    if not page:
        return {"slug": page_slug, "title": "", "content": ""}
    return page

@api_router.put("/cms/{page_slug}")
async def update_cms_page(page_slug: str, payload: dict, user: dict = Depends(get_admin_user)):
    """Update CMS page content (admin only)"""
    await db.cms_pages.update_one(
        {"slug": page_slug},
        {"$set": {"slug": page_slug, "title": payload.get("title", ""), "content": payload.get("content", "")}},
        upsert=True,
    )
    return {"success": True}

# ===================== PAYMENT METHOD ICONS =====================

PAYMENT_METHODS_LIST = [
    {"code": "qris", "name": "QRIS"},
    {"code": "bca", "name": "BCA Virtual Account"},
    {"code": "bni", "name": "BNI Virtual Account"},
    {"code": "bri", "name": "BRI Virtual Account"},
    {"code": "mandiri", "name": "Mandiri Virtual Account"},
    {"code": "permata", "name": "Permata Virtual Account"},
    {"code": "cimb", "name": "CIMB Niaga Virtual Account"},
]

@api_router.get("/payment-icons")
async def get_payment_icons():
    """Get all payment method icons (with defaults)"""
    saved = {}
    async for ic in db.payment_icons.find({}, {"_id": 0}):
        saved[ic["code"]] = ic.get("icon", "")
    result = []
    for pm in PAYMENT_METHODS_LIST:
        result.append({**pm, "icon": saved.get(pm["code"], "")})
    return {"icons": result}

@api_router.put("/payment-icons/{code}")
async def update_payment_icon(code: str, payload: dict, user: dict = Depends(get_admin_user)):
    """Update icon for a single payment method. Body: { "icon": "https://..." }"""
    icon_url = payload.get("icon", "").strip()
    valid_codes = [pm["code"] for pm in PAYMENT_METHODS_LIST]
    if code not in valid_codes:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.payment_icons.update_one(
        {"code": code},
        {"$set": {"code": code, "icon": icon_url}},
        upsert=True,
    )
    return {"success": True, "code": code, "icon": icon_url}

# ===================== FILE UPLOAD =====================

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/upload/icon")
async def upload_icon(file: UploadFile = File(...)):
    """Upload an image file and return its URL"""
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    if ext not in ("png", "jpg", "jpeg", "webp", "gif", "svg"):
        raise HTTPException(status_code=400, detail="Format file tidak didukung")

    filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    filepath = UPLOAD_DIR / filename

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File terlalu besar (max 5MB)")

    with open(filepath, "wb") as f:
        f.write(contents)

    url = f"/icons/{filename}"
    return {"success": True, "url": url, "filename": filename}

# ===================== MULTI-SITE ADMIN ENDPOINTS =====================
# Admin-only endpoints for managing:
#   • site_configs (prefix + forward URLs per site)
#   • integration_settings (Ayolinx & DigiFlazz overrides)
#   • frontend switcher (subprocess to switch-site.sh)

class SiteConfigPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    site_id: str
    prefix: str
    brand_name: Optional[str] = ""
    forward_url_qris: Optional[str] = None
    forward_url_va: Optional[str] = None
    forward_url_digiflazz: Optional[str] = None
    process_locally: bool = False
    active: bool = True
    notes: Optional[str] = ""


class IntegrationSettingsPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")
    config: dict


SITES_ROOT = Path("/app/sites")
SCRIPTS_ROOT = Path("/app/scripts")


@api_router.get("/admin/site-configs")
async def list_site_configs(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    items = await db.site_configs.find({}, {"_id": 0}).sort("site_id", 1).to_list(200)
    return {"items": items}


@api_router.post("/admin/site-configs")
async def create_site_config(payload: SiteConfigPayload, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    site_id = payload.site_id.strip().lower()
    if not site_id:
        raise HTTPException(status_code=400, detail="site_id required")
    prefix = payload.prefix.strip().upper()[:3]
    if len(prefix) != 3 or not prefix.isalnum():
        raise HTTPException(status_code=400, detail="prefix must be exactly 3 alphanumeric chars")
    # Unique constraints
    existing_site = await db.site_configs.find_one({"site_id": site_id}, {"_id": 0})
    if existing_site:
        raise HTTPException(status_code=409, detail=f"site_id '{site_id}' already exists")
    existing_prefix = await db.site_configs.find_one({"prefix": prefix}, {"_id": 0})
    if existing_prefix:
        raise HTTPException(status_code=409, detail=f"prefix '{prefix}' already used by site '{existing_prefix['site_id']}'")
    doc = {
        "site_id": site_id,
        "prefix": prefix,
        "brand_name": payload.brand_name or site_id.capitalize(),
        "forward_url_qris": payload.forward_url_qris,
        "forward_url_va": payload.forward_url_va,
        "forward_url_digiflazz": payload.forward_url_digiflazz,
        "process_locally": bool(payload.process_locally),
        "active": bool(payload.active),
        "notes": payload.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.site_configs.insert_one(doc)
    return {"item": {k: v for k, v in doc.items() if k != "_id"}}


@api_router.put("/admin/site-configs/{site_id}")
async def update_site_config(site_id: str, payload: SiteConfigPayload, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    existing = await db.site_configs.find_one({"site_id": site_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Site config not found")
    prefix = payload.prefix.strip().upper()[:3]
    if len(prefix) != 3 or not prefix.isalnum():
        raise HTTPException(status_code=400, detail="prefix must be exactly 3 alphanumeric chars")
    # Prefix collision check (excluding current)
    other = await db.site_configs.find_one({"prefix": prefix, "site_id": {"$ne": site_id}}, {"_id": 0})
    if other:
        raise HTTPException(status_code=409, detail=f"prefix '{prefix}' already used by '{other['site_id']}'")
    updates = {
        "prefix": prefix,
        "brand_name": payload.brand_name or existing.get("brand_name", site_id),
        "forward_url_qris": payload.forward_url_qris,
        "forward_url_va": payload.forward_url_va,
        "forward_url_digiflazz": payload.forward_url_digiflazz,
        "process_locally": bool(payload.process_locally),
        "active": bool(payload.active),
        "notes": payload.notes or "",
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.site_configs.update_one({"site_id": site_id}, {"$set": updates})
    merged = {**existing, **updates}
    return {"item": {k: v for k, v in merged.items() if k != "_id"}}


@api_router.delete("/admin/site-configs/{site_id}")
async def delete_site_config(site_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    if site_id == "blaze":
        raise HTTPException(status_code=400, detail="Cannot delete default 'blaze' site config")
    result = await db.site_configs.delete_one({"site_id": site_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Site config not found")
    return {"deleted": site_id}


# ----- Integration settings (Ayolinx / DigiFlazz) -----

@api_router.get("/admin/integrations")
async def list_integration_settings(user: dict = Depends(get_current_user)):
    """Return resolved settings for both services with secrets masked."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    result = {}
    for svc in ("ayolinx", "digiflazz"):
        cfg = await get_integration_config(svc)
        sensitive_keys = {"client_secret", "api_key", "webhook_secret", "private_key_pem"}
        sanitized = {}
        for k, v in cfg.items():
            if k == "_source":
                continue
            sanitized[k] = mask_secret(v) if k in sensitive_keys else v
        result[svc] = {
            "values": sanitized,
            "source": cfg.get("_source", {}),
        }
    return {"settings": result}


@api_router.put("/admin/integrations/{service}")
async def update_integration_settings(service: str, payload: IntegrationSettingsPayload, user: dict = Depends(get_current_user)):
    """Save DB override for a service. Pass empty string to clear (revert to env)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    service = service.lower()
    if service not in INTEGRATION_ENV_MAP:
        raise HTTPException(status_code=400, detail=f"Unknown service '{service}'")
    allowed_keys = set(INTEGRATION_ENV_MAP[service].keys())
    cleaned = {}
    for k, v in (payload.config or {}).items():
        if k in allowed_keys and isinstance(v, str):
            v = v.strip()
            if v:
                cleaned[k] = v
    await db.integration_settings.update_one(
        {"service": service},
        {"$set": {
            "service": service,
            "config": cleaned,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.get("email"),
        }},
        upsert=True,
    )
    return {"ok": True, "service": service, "saved_keys": list(cleaned.keys())}


# ----- Test-connection endpoints -----

@api_router.post("/admin/integrations/{service}/test")
async def test_integration_connection(service: str, user: dict = Depends(get_current_user)):
    """Lightweight liveness check using the saved (DB-first, env-fallback) credentials.

    - ayolinx: trigger refresh + B2B access-token request.
    - digiflazz: trigger refresh + check_balance (Cek Saldo).
    Returns {ok, message, details} so the UI can show a clear status line.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    service = service.lower()
    if service == "ayolinx":
        from services.ayolinx import ayolinx_service
        try:
            await ayolinx_service.refresh_from_db(db)
            # Inline copy of get_access_token but capture full response for diagnostics
            import httpx
            timestamp = ayolinx_service._get_timestamp()
            signature = ayolinx_service._sign_for_token(timestamp)
            headers = {
                "Content-Type": "application/json",
                "X-TIMESTAMP": timestamp,
                "X-CLIENT-KEY": ayolinx_service.client_key or "",
                "X-SIGNATURE": signature or "",
            }
            body = {"grantType": "client_credentials"}
            async with httpx.AsyncClient() as client_http:
                resp = await client_http.post(
                    f"{ayolinx_service.base_url}/v1.0/access-token/b2b",
                    headers=headers, json=body, timeout=20.0,
                )
                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text[:500]}
            response_code = data.get("responseCode")
            ok = response_code == "2007300"
            return {
                "ok": ok,
                "message": (
                    "Ayolinx connection OK — access token diperoleh"
                    if ok else
                    f"Ayolinx menolak: code={response_code} message={data.get('responseMessage', data.get('message', 'unknown'))}"
                ),
                "details": {
                    "mode": "sandbox" if "sandbox" in (ayolinx_service.base_url or "") else "production",
                    "base_url": ayolinx_service.base_url,
                    "client_key_set": bool(ayolinx_service.client_key),
                    "private_key_loaded": bool(ayolinx_service.private_key),
                    "http_status": resp.status_code,
                    "response_code": response_code,
                    "response_message": data.get("responseMessage") or data.get("message"),
                    # Truncated raw response for debugging
                    "response_preview": {k: (str(v)[:120] if isinstance(v, str) else v) for k, v in data.items()},
                },
            }
        except Exception as e:
            return {"ok": False, "message": f"Ayolinx error: {e}", "details": {}}
    elif service == "digiflazz":
        from services.digiflazz import digiflazz_service
        try:
            await digiflazz_service.refresh_from_db(db)
            result = await digiflazz_service.check_balance()
            ok = bool(result.get("success"))
            return {
                "ok": ok,
                "message": "DigiFlazz connection OK — balance fetched" if ok
                            else f"DigiFlazz returned: {result.get('error') or result.get('message') or 'unknown'}",
                "details": {
                    "mode": digiflazz_service.mode,
                    "username_set": bool(digiflazz_service.username),
                    "api_key_set": bool(digiflazz_service.api_key),
                    "deposit": result.get("deposit") if ok else None,
                },
            }
        except Exception as e:
            return {"ok": False, "message": f"DigiFlazz error: {e}", "details": {}}
    raise HTTPException(status_code=400, detail=f"Unknown service '{service}'")


# ----- Frontend switcher -----

@api_router.get("/admin/sites/available")
async def list_available_sites(user: dict = Depends(get_current_user)):
    """List all site folders + the currently active one (via symlink)."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    sites = []
    if SITES_ROOT.exists():
        for d in sorted(SITES_ROOT.iterdir()):
            if d.is_dir():
                brand = ""
                theme_path = d / "src" / "theme.config.js"
                if theme_path.exists():
                    try:
                        text = theme_path.read_text(encoding="utf-8")
                        # Extract brand.name from JS source (handle both syntaxes)
                        import re
                        m = re.search(r'"name"\s*:\s*"([^"]+)"', text) or re.search(r"name:\s*['\"]([^'\"]+)['\"]", text)
                        if m:
                            brand = m.group(1)
                    except Exception:
                        pass
                sites.append({"name": d.name, "brand": brand or d.name})
    # Active site = readlink /app/frontend
    active = None
    try:
        link = Path("/app/frontend").resolve()
        if str(link).startswith(str(SITES_ROOT)):
            active = link.name
    except Exception:
        pass
    return {"sites": sites, "active": active}


@api_router.post("/admin/sites/switch")
async def switch_active_site(payload: dict, user: dict = Depends(get_current_user)):
    """Run /app/scripts/switch-site.sh <name>. Returns logs."""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    name = (payload.get("name") or "").strip()
    # Basic validation: alphanumeric + dashes/underscores only
    import re
    if not name or not re.fullmatch(r"[A-Za-z0-9_\-]+", name):
        raise HTTPException(status_code=400, detail="Invalid site name")
    target = SITES_ROOT / name
    if not target.is_dir():
        raise HTTPException(status_code=404, detail=f"Site '{name}' not found at {target}")
    script = SCRIPTS_ROOT / "switch-site.sh"
    if not script.exists():
        raise HTTPException(status_code=500, detail="switch-site.sh missing")
    try:
        proc = subprocess.run(
            ["bash", str(script), name],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return {
            "ok": proc.returncode == 0,
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "active": name,
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Switch command timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Switch failed: {e}")


# ----- Clone-new-site (build a new themed site from JSON preset) -----

import json as _json
import re as _re

THEMES_ROOT = Path("/app/themes")

REQUIRED_THEME_FIELDS = {"siteId", "orderPrefix", "brand", "meta", "assets", "copy", "colors", "fonts"}


def _generate_brand_logo_svg(
    brand_name: str,
    primary: str,
    accent: str,
    icon_variant: str = "burst",
    display_font: Optional[str] = None,
) -> str:
    """Generate a horizontal SVG logo = thematic icon + brand-name wordmark.

    `icon_variant` selects the graphic mark. Supported tokens (typically
    derived from theme.style.heroVisual):
      - 'burst'         → flame/energy spikes (Blaze)
      - 'circuit'       → hex node + connectors (NeonForge / QuantumDrop)
      - 'pixel-stack'   → stacked pixel blocks (PixelVault)
      - 'crown'         → minimal crown (EliteCharge)
      - 'crosshair'     → radar reticle (RaidStation)
      - 'hex-badge'     → fallback hexagonal monogram
    """
    safe = "".join(ch for ch in (brand_name or "?") if ch.isalnum() or ch == " ").strip() or "Brand"
    # Word-mark font sizing scales down for long names so it stays inside the viewBox.
    char_count = max(len(safe), 1)
    font_size = 30 if char_count <= 6 else (26 if char_count <= 9 else (22 if char_count <= 12 else 18))
    # Dynamic viewBox width based on estimated text width + icon area + padding.
    # Display fonts (Orbitron, Bebas Neue, Press Start 2P, Playfair) tend to be wider
    # than generic sans-serif → use 0.72×fontSize plus letter-spacing (1.5px) and
    # generous right padding so the wordmark never gets clipped inside <img>.
    glyph_advance = font_size * 0.72 + 1.5
    text_width_est = int(char_count * glyph_advance)
    text_x = 78  # icon box (0-64) + 14px gap
    right_pad = 24
    vb_w = max(text_x + text_width_est + right_pad, 200)
    vb_h = 70

    primary = primary if (isinstance(primary, str) and primary.startswith("#")) else "#FF0000"
    accent = accent if (isinstance(accent, str) and accent.startswith("#")) else "#FFD700"
    display_font = display_font or "'Rajdhani','Space Grotesk','Oswald','Inter',sans-serif"

    # ---- Icon shapes (centered in a 64x64 box at x=0..64, y=3..67) ----
    icons = {
        "burst": '''
            <!-- Flame burst: outer rays + inner flame -->
            <g transform="translate(8,8)">
              <path d="M24 2 L28 16 L24 22 L20 16 Z" fill="url(#brandGrad)"/>
              <path d="M44 12 L36 22 L30 22 L36 16 Z" fill="url(#brandGrad)" opacity="0.85"/>
              <path d="M4 12 L12 22 L18 22 L12 16 Z" fill="url(#brandGrad)" opacity="0.85"/>
              <path d="M24 16 C 14 22, 12 36, 24 46 C 36 36, 34 22, 24 16 Z"
                    fill="url(#brandGrad)" stroke="rgba(255,255,255,0.8)" stroke-width="1.5"/>
              <circle cx="24" cy="38" r="4" fill="white" opacity="0.85"/>
            </g>''',
        "circuit": '''
            <!-- Hex node with 4 connecting traces and inner dot -->
            <g transform="translate(8,8)">
              <line x1="0" y1="24" x2="14" y2="24" stroke="url(#brandGrad)" stroke-width="2.5"/>
              <line x1="34" y1="24" x2="48" y2="24" stroke="url(#brandGrad)" stroke-width="2.5"/>
              <line x1="24" y1="0" x2="24" y2="10" stroke="url(#brandGrad)" stroke-width="2.5"/>
              <line x1="24" y1="38" x2="24" y2="48" stroke="url(#brandGrad)" stroke-width="2.5"/>
              <circle cx="0" cy="24" r="3" fill="''' + accent + '''"/>
              <circle cx="48" cy="24" r="3" fill="''' + accent + '''"/>
              <circle cx="24" cy="0" r="3" fill="''' + accent + '''"/>
              <circle cx="24" cy="48" r="3" fill="''' + accent + '''"/>
              <polygon points="24,8 38,16 38,32 24,40 10,32 10,16"
                       fill="url(#brandGrad)" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"/>
              <circle cx="24" cy="24" r="4" fill="white" opacity="0.9"/>
            </g>''',
        "pixel-stack": '''
            <!-- 3D stacked pixel blocks -->
            <g transform="translate(8,8)">
              <rect x="4"  y="32" width="14" height="14" fill="''' + primary + '''" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
              <rect x="18" y="32" width="14" height="14" fill="''' + accent + '''" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
              <rect x="32" y="32" width="14" height="14" fill="''' + primary + '''" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
              <rect x="11" y="18" width="14" height="14" fill="''' + accent + '''" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
              <rect x="25" y="18" width="14" height="14" fill="''' + primary + '''" stroke="rgba(255,255,255,0.7)" stroke-width="1.5"/>
              <rect x="18" y="4"  width="14" height="14" fill="url(#brandGrad)" stroke="rgba(255,255,255,0.9)" stroke-width="1.5"/>
            </g>''',
        "crown": '''
            <!-- Minimal three-spike crown with center jewel -->
            <g transform="translate(8,12)">
              <path d="M2 36 L6 14 L16 26 L24 6 L32 26 L42 14 L46 36 Z"
                    fill="url(#brandGrad)" stroke="rgba(255,255,255,0.85)" stroke-width="1.6"/>
              <rect x="2" y="38" width="44" height="4" fill="''' + accent + '''" stroke="rgba(255,255,255,0.6)" stroke-width="0.8"/>
              <circle cx="24" cy="22" r="3.5" fill="white" stroke="''' + accent + '''" stroke-width="1.2"/>
            </g>''',
        "crosshair": '''
            <!-- Tactical radar reticle: outer ring, crosshair lines, range marks -->
            <g transform="translate(8,8)">
              <circle cx="24" cy="24" r="22" fill="none" stroke="url(#brandGrad)" stroke-width="2.4"/>
              <circle cx="24" cy="24" r="13" fill="none" stroke="''' + accent + '''" stroke-width="1.5" opacity="0.85"/>
              <line x1="24" y1="0"  x2="24" y2="8"  stroke="''' + accent + '''" stroke-width="2.4"/>
              <line x1="24" y1="40" x2="24" y2="48" stroke="''' + accent + '''" stroke-width="2.4"/>
              <line x1="0"  y1="24" x2="8"  y2="24" stroke="''' + accent + '''" stroke-width="2.4"/>
              <line x1="40" y1="24" x2="48" y2="24" stroke="''' + accent + '''" stroke-width="2.4"/>
              <circle cx="24" cy="24" r="3.5" fill="white"/>
            </g>''',
        "hex-badge": '''
            <!-- Fallback: hex badge with brand monogram (single letter) -->
            <g transform="translate(8,8)">
              <polygon points="24,2 44,13 44,35 24,46 4,35 4,13"
                       fill="url(#brandGrad)" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/>
              <text x="24" y="33" text-anchor="middle" font-family="''' + display_font.replace('"',"&quot;") + '''"
                    font-weight="800" font-size="26" fill="white">''' + safe[:1].upper() + '''</text>
            </g>''',
        "deep-abyss": '''
            <!-- Deep-sea jellyfish: bell dome + bioluminescent tentacles -->
            <g transform="translate(8,8)">
              <!-- Bell dome with concentric depth rings -->
              <path d="M6 22 Q24 -2 42 22 L42 26 Q24 22 6 26 Z"
                    fill="url(#brandGrad)" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>
              <path d="M10 18 Q24 4 38 18" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1"/>
              <path d="M14 13 Q24 6 34 13" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/>
              <!-- Tentacles (wavy) -->
              <path d="M10 26 Q8 32 12 36 Q9 40 12 46" fill="none" stroke="''' + accent + '''" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M18 26 Q17 33 20 38 Q17 42 19 47" fill="none" stroke="''' + accent + '''" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M24 26 Q25 33 23 39 Q26 43 24 48" fill="none" stroke="''' + accent + '''" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M30 26 Q31 33 28 38 Q31 42 29 47" fill="none" stroke="''' + accent + '''" stroke-width="1.6" stroke-linecap="round"/>
              <path d="M38 26 Q40 32 36 36 Q39 40 36 46" fill="none" stroke="''' + accent + '''" stroke-width="1.6" stroke-linecap="round"/>
              <!-- Bioluminescent core -->
              <circle cx="24" cy="20" r="3" fill="white" opacity="0.9"/>
              <circle cx="24" cy="20" r="6" fill="none" stroke="white" stroke-width="0.5" opacity="0.4"/>
            </g>''',
        "terminal-feed": '''
            <!-- Terminal prompt: angle bracket + cursor + code stream -->
            <g transform="translate(8,8)">
              <!-- Frame -->
              <rect x="2" y="6" width="44" height="36" rx="3" fill="rgba(0,0,0,0.85)"
                    stroke="url(#brandGrad)" stroke-width="2"/>
              <!-- Window dots -->
              <circle cx="7" cy="11" r="1.2" fill="''' + accent + '''" opacity="0.8"/>
              <circle cx="11" cy="11" r="1.2" fill="''' + accent + '''" opacity="0.55"/>
              <circle cx="15" cy="11" r="1.2" fill="''' + accent + '''" opacity="0.35"/>
              <!-- Prompt: > -->
              <path d="M7 22 L13 26 L7 30" fill="none" stroke="url(#brandGrad)"
                    stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
              <!-- Code lines -->
              <rect x="17" y="20" width="20" height="2" fill="''' + primary + '''" opacity="0.9"/>
              <rect x="17" y="25" width="14" height="2" fill="''' + accent + '''" opacity="0.85"/>
              <rect x="17" y="30" width="18" height="2" fill="''' + primary + '''" opacity="0.8"/>
              <!-- Blinking cursor block -->
              <rect x="38" y="29" width="4" height="4" fill="''' + accent + '''"/>
            </g>''',
    }
    icon = icons.get(icon_variant, icons["hex-badge"])

    # ---- Wordmark (kerned, slight letter-spacing, primary→accent gradient fill) ----
    word = safe.upper() if char_count <= 12 else safe  # all-caps reads strong for short names
    text_y = 44  # vertical baseline inside the 70px viewBox

    return f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vb_w} {vb_h}" role="img" aria-label="{brand_name} logo">
  <defs>
    <linearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"  stop-color="{primary}"/>
      <stop offset="100%" stop-color="{accent}"/>
    </linearGradient>
    <linearGradient id="textGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"  stop-color="{primary}"/>
      <stop offset="60%" stop-color="white"/>
      <stop offset="100%" stop-color="{accent}"/>
    </linearGradient>
    <filter id="brandGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <!-- Thematic graphic mark -->
  <g filter="url(#brandGlow)">{icon}</g>
  <!-- Brand-name wordmark -->
  <text x="{text_x}" y="{text_y}"
        font-family="{display_font.replace('"','&quot;')}"
        font-weight="800"
        font-size="{font_size}"
        fill="url(#textGrad)"
        style="letter-spacing:1.5px">{word}</text>
</svg>
'''


# Map theme.style.heroVisual → icon variant (1:1 if matching shape exists)
_HERO_VISUAL_TO_ICON = {
    "controller-orb": "burst",
    "circuit-grid": "circuit",
    "pixel-tiles": "pixel-stack",
    "gold-orbs": "crown",
    "crosshair-radar": "crosshair",
    "deep-abyss": "deep-abyss",
    "terminal-feed": "terminal-feed",
}


def _write_brand_logo(site_dir: Path, theme_obj: dict) -> Optional[str]:
    """Write a generated SVG logo into the site's public folder.

    Returns the public-relative path written (e.g. '/logo-mybrand.svg') or
    None on failure. Also patches theme.assets.logo to point to it.
    """
    try:
        site_id = theme_obj.get("siteId") or "site"
        brand = (theme_obj.get("brand") or {}).get("name") or site_id
        colors = theme_obj.get("colors") or {}
        style = theme_obj.get("style") or {}
        fonts = theme_obj.get("fonts") or {}
        hero = style.get("heroVisual") or "controller-orb"
        icon_variant = _HERO_VISUAL_TO_ICON.get(hero, "hex-badge")
        display_font = fonts.get("display")
        svg = _generate_brand_logo_svg(
            brand,
            colors.get("primary", "#FF0000"),
            colors.get("accent", "#FFD700"),
            icon_variant=icon_variant,
            display_font=display_font,
        )
        public_dir = site_dir / "public"
        public_dir.mkdir(parents=True, exist_ok=True)
        logo_name = f"logo-{site_id}.svg"
        (public_dir / logo_name).write_text(svg, encoding="utf-8")
        rel_path = f"/{logo_name}"
        theme_obj.setdefault("assets", {})["logo"] = rel_path
        return rel_path
    except Exception:
        import logging
        logging.getLogger(__name__).exception("Failed to generate brand logo")
        return None


def _validate_theme_json(theme_obj: dict) -> Optional[str]:
    """Return None if valid, else a human-readable error string."""
    if not isinstance(theme_obj, dict):
        return "Theme must be a JSON object"
    missing = [k for k in REQUIRED_THEME_FIELDS if k not in theme_obj]
    if missing:
        return f"Missing required fields: {', '.join(missing)}"
    sid = theme_obj.get("siteId", "")
    if not _re.fullmatch(r"[a-z0-9][a-z0-9_-]{1,30}", str(sid)):
        return "siteId must be 2-31 chars, lowercase alnum/dash/underscore, start with alnum"
    prefix = str(theme_obj.get("orderPrefix", "")).upper()
    if not _re.fullmatch(r"[A-Z0-9]{3}", prefix):
        return "orderPrefix must be exactly 3 alphanumeric characters (e.g. NEO)"
    brand = theme_obj.get("brand") or {}
    if not isinstance(brand, dict) or not brand.get("name"):
        return "brand.name is required"
    colors = theme_obj.get("colors") or {}
    # Must match the keys consumed by /app/scripts/apply-theme.js (hexToHslComponents)
    for col in ("primary", "secondary", "background", "foreground", "card",
                "border", "accent", "destructive"):
        if not isinstance(colors.get(col), str) or not colors[col].startswith("#"):
            return f"colors.{col} must be a #hex string"
    return None


@api_router.post("/admin/sites/clone-new")
async def clone_new_site(payload: dict, user: dict = Depends(get_current_user)):
    """
    Create a NEW themed clone site from an uploaded theme JSON. The admin posts
    the entire theme object. Backend will:
      1. Validate required fields & uniqueness (site_id + prefix).
      2. Write /app/themes/{siteId}.json.
      3. Run /app/scripts/clone-site.sh {siteId} {siteId} to scaffold the React app.
      4. Insert a default site_configs row (process_locally=True, active=True).
    Returns scaffold logs so the admin can see what happened.
    """
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    theme_obj = payload.get("theme") if isinstance(payload, dict) else None
    if not isinstance(theme_obj, dict):
        raise HTTPException(status_code=400, detail="Body must be {theme: {...}}")
    err = _validate_theme_json(theme_obj)
    if err:
        raise HTTPException(status_code=400, detail=err)

    site_id = theme_obj["siteId"]
    prefix = str(theme_obj["orderPrefix"]).upper()
    brand_name = theme_obj["brand"]["name"]

    # Uniqueness checks
    if (SITES_ROOT / site_id).exists():
        raise HTTPException(status_code=409, detail=f"Site folder '{site_id}' already exists")
    if await db.site_configs.find_one({"site_id": site_id}):
        raise HTTPException(status_code=409, detail=f"site_id '{site_id}' already registered in DB")
    if await db.site_configs.find_one({"prefix": prefix}):
        raise HTTPException(status_code=409, detail=f"prefix '{prefix}' already used by another site")

    # Persist theme JSON
    THEMES_ROOT.mkdir(parents=True, exist_ok=True)
    theme_path = THEMES_ROOT / f"{site_id}.json"
    try:
        theme_path.write_text(_json.dumps(theme_obj, indent=2), encoding="utf-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to write theme JSON: {e}")

    # Run clone-site.sh
    script = SCRIPTS_ROOT / "clone-site.sh"
    if not script.exists():
        raise HTTPException(status_code=500, detail="clone-site.sh missing")
    try:
        proc = subprocess.run(
            ["bash", str(script), site_id, site_id],
            capture_output=True, text=True, timeout=90,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="clone-site.sh timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Clone command failed: {e}")

    if proc.returncode != 0:
        # Cleanup partial artifacts: theme JSON + scaffolded folder
        import shutil as _shutil
        try:
            theme_path.unlink(missing_ok=True)
        except Exception:
            pass
        try:
            partial = SITES_ROOT / site_id
            if partial.exists():
                _shutil.rmtree(partial, ignore_errors=True)
        except Exception:
            pass
        return {
            "ok": False,
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "message": "clone-site.sh exited non-zero. See stderr.",
        }

    # Register in DB
    cfg_doc = {
        "site_id": site_id,
        "prefix": prefix,
        "brand_name": brand_name,
        "forward_url_qris": None,
        "forward_url_va": None,
        "forward_url_digiflazz": None,
        "process_locally": True,
        "active": True,
        "notes": f"Created via admin clone-new at {datetime.now(timezone.utc).isoformat()}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.site_configs.insert_one(cfg_doc)

    # Auto-generate brand logo (SVG monogram) and patch theme.config.js
    site_dir = SITES_ROOT / site_id
    logo_rel = _write_brand_logo(site_dir, theme_obj)
    if logo_rel:
        # Re-write theme JSON with the patched logo path so future re-applies stay consistent
        try:
            theme_path.write_text(_json.dumps(theme_obj, indent=2), encoding="utf-8")
        except Exception:
            pass
        # Patch theme.config.js generated by apply-theme.js so the React app
        # picks up the new logo path immediately (without re-clone).
        try:
            cfg_js = site_dir / "src" / "theme.config.js"
            if cfg_js.exists():
                txt = cfg_js.read_text(encoding="utf-8")
                import re as _r
                # Try to update an existing "logo": "..." entry first.
                new_txt, n = _r.subn(
                    r'(["\']?logo["\']?\s*:\s*["\'])[^"\']*(["\'])',
                    rf'\g<1>{logo_rel}\g<2>',
                    txt, count=1,
                )
                if n == 0:
                    # No existing logo field — inject into the "assets": { ... block.
                    new_txt, n = _r.subn(
                        r'("assets"\s*:\s*\{)',
                        rf'\1\n    "logo": "{logo_rel}",',
                        txt, count=1,
                    )
                if n > 0:
                    cfg_js.write_text(new_txt, encoding="utf-8")
        except Exception:
            pass

    return {
        "ok": True,
        "site_id": site_id,
        "prefix": prefix,
        "brand_name": brand_name,
        "theme_path": str(theme_path),
        "logo_path": logo_rel,
        "stdout": proc.stdout,
        "stderr": proc.stderr,
        "message": f"Site '{site_id}' created. Switch ke site ini via tab Sites untuk preview.",
    }


# ----- Startup: seed default site configs -----

@app.on_event("startup")
async def seed_multi_site_defaults():
    """Idempotent seed for site_configs collection."""
    # Read existing prefix-to-URL mapping from old hardcoded VTX values
    vtx_qris = os.environ.get("VTX_FORWARD_QRIS", "https://vortexgamers.cloud/api/payment/ayolinx/callback/qris")
    vtx_va   = os.environ.get("VTX_FORWARD_VA",   "https://vortexgamers.cloud/api/payment/ayolinx/callback/va")

    defaults = [
        {
            "site_id": "blaze",
            "prefix": "BLZ",
            "brand_name": "BlazeStore",
            "forward_url_qris": None,
            "forward_url_va": None,
            "forward_url_digiflazz": None,
            "process_locally": True,
            "active": True,
            "notes": "Default master site — processes callbacks locally.",
        },
        {
            "site_id": "vortex",
            "prefix": "VTX",
            "brand_name": "Vortex Gamers (proxy)",
            "forward_url_qris": vtx_qris,
            "forward_url_va": vtx_va,
            "forward_url_digiflazz": None,
            "process_locally": False,
            "active": True,
            "notes": "Legacy proxy forwarding target (kept for backward compat).",
        },
        {
            "site_id": "neonforge",
            "prefix": "NEO",
            "brand_name": "NeonForge",
            "forward_url_qris": None,
            "forward_url_va": None,
            "forward_url_digiflazz": None,
            "process_locally": True,
            "active": True,
            "notes": "Cyberpunk-themed clone site.",
        },
        {
            "site_id": "pixelvault",
            "prefix": "PXV",
            "brand_name": "PixelVault",
            "forward_url_qris": None,
            "forward_url_va": None,
            "forward_url_digiflazz": None,
            "process_locally": True,
            "active": True,
            "notes": "Retro arcade-themed clone site.",
        },
        {
            "site_id": "elitecharge",
            "prefix": "ELC",
            "brand_name": "EliteCharge",
            "forward_url_qris": None,
            "forward_url_va": None,
            "forward_url_digiflazz": None,
            "process_locally": True,
            "active": True,
            "notes": "Premium/luxury-themed clone site.",
        },
        {
            "site_id": "raidstation",
            "prefix": "RDS",
            "brand_name": "RaidStation",
            "forward_url_qris": None,
            "forward_url_va": None,
            "forward_url_digiflazz": None,
            "process_locally": True,
            "active": True,
            "notes": "Tactical military/esports-themed clone site.",
        },
    ]
    for d in defaults:
        existing = await db.site_configs.find_one({"site_id": d["site_id"]})
        if not existing:
            d["created_at"] = datetime.now(timezone.utc).isoformat()
            d["updated_at"] = d["created_at"]
            await db.site_configs.insert_one(d)
            logger.info(f"Seeded site_config: {d['site_id']} ({d['prefix']})")


# Include the router
app.include_router(api_router)

# Include payment routes
from routes.payment import router as payment_router
app.include_router(payment_router, prefix="/api")

# Include biller routes (DigiFlazz)
from routes.biller import router as biller_router
app.include_router(biller_router, prefix="/api")

# Serve uploaded files
app.mount("/api/static/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


