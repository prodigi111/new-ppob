from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
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
async def create_order(data: OrderCreate, user: Optional[dict] = None):
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
    
    order = Order(
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
async def create_guest_order(data: OrderCreate):
    return await create_order(data, None)

@api_router.post("/orders/authenticated")
async def create_authenticated_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    return await create_order(data, user)

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
    orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"orders": orders}

@api_router.put("/admin/orders/{order_id}/status")
async def admin_update_order_status(order_id: str, status: str, user: dict = Depends(get_admin_user)):
    if status not in ["pending", "processing", "completed", "failed"]:
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
            "image": "https://i.ibb.co/4gKfN7q/ml-logo.png",
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
            "image": "https://i.ibb.co/TKxGk5d/ff-logo.png",
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
            "image": "https://i.ibb.co/5YbfXMt/genshin-logo.png",
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
            "image": "https://i.ibb.co/vPCQXrB/valorant-logo.png",
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
            "image": "https://i.ibb.co/7pPR8zF/hsr-logo.png",
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

# Include the router
app.include_router(api_router)

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
