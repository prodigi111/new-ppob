"""
DigiFlazz Biller Routes
"""
from fastapi import APIRouter, HTTPException, Query
from fastapi.requests import Request
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os
import json
import logging

from services.digiflazz import digiflazz_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/biller", tags=["Biller"])

# DB access
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]

# Brand image mapping for popular games
BRAND_IMAGES = {
    "MOBILE LEGENDS": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/cee16accebeee5f4f3e4600e7b22ae4ccf875422c90de0b267e5e8f3e47a5656.png",
    "FREE FIRE": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/6a096a6814120c873f79e4868339be4d303089099a90b6160bfc2845cdfce341.png",
    "PUBG MOBILE": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/91cfd5a5f41e04ef15b79a59eac5fe9b7b7445c2d424ae727177255aeea319a5.png",
    "Genshin Impact": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/76a037f815dcb24d2faf5b13c3771f3cedcf730f1c8e56e6aaf9b7bf2875e505.png",
    "Valorant": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/f4fc57e7c68e201a2b57693574a22a718d0036c88dc2aecd0a29bfec88020982.png",
    "Call of Duty MOBILE": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/73dcb067d112b688b0a80567fbfdd0bf584856fd62553cf9522d65c73f3ac548.png",
    "ARENA OF VALOR": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/6a4c09713b27707761c16d2962d8c098e6808ff7ed25e46d16a56e75603a5fa4.png",
    "POINT BLANK": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/458b69a60833211a415d03f28ea74f8717ffc2be1bac868c1d13440881e33761.png",
    "GARENA": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/e59f95df993f2c175e1b4621ee7840e669b8e856a24a33ad54aff4e13a7bce13.png",
    "Nintendo eShop": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/e38681ff8bddb25445ce44e21d47fa992b5b678a0b3d86cf9cae8c34afbc48b5.png",
    "Unipin Voucher": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/552d28a6510055c6139d6f6e39003ecb3fac105fa15c2d461b0aa60faeb50246.png",
    "TELKOMSEL": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/847b9aa84734db88cafdf81115a4d8fc624e029791f9eedde53fbd9080dd269a.png",
    "XL": "https://static.prod-images.emergentagent.com/jobs/81317519-044e-44f8-94cc-ed69b802fa9e/images/53c3be9e9cd7dc926a2d298a17887be059c84f365d7a3080f1b7e1691d5203c5.png",
}

# Map DigiFlazz categories to our 3 categories: games, pulsa, voucher
CATEGORY_MAP = {
    "Games": "games",
    "Voucher": "voucher",
    "Aktivasi Voucher": "pulsa",
    "Pulsa": "pulsa",
    "Data": "pulsa",
    "E-Money": "voucher",
    "PLN": "voucher",
    "PDAM": "voucher",
    "Paket SMS & Telepon": "pulsa",
}
# Brand overrides for correct classification
BRAND_CATEGORY_OVERRIDE = {
    "XL": "pulsa",
    "TELKOMSEL": "pulsa",
    "POINT BLANK": "games",
    "GARENA": "voucher",
    "Nintendo eShop": "voucher",
    "Unipin Voucher": "voucher",
}

router = APIRouter(prefix="/biller", tags=["Biller"])


class TopupRequest(BaseModel):
    buyer_sku_code: str = Field(..., description="Product SKU code from DigiFlazz")
    customer_no: str = Field(..., description="Customer number/ID (phone, game ID, etc.)")
    order_id: Optional[str] = Field(default=None, description="Optional order ID for reference")


class TopupResponse(BaseModel):
    success: bool
    pending: bool = False
    message: str
    data: Optional[dict] = None


@router.get("/balance")
async def check_balance():
    """
    Check DigiFlazz deposit balance
    """
    result = await digiflazz_service.check_balance()
    
    if result.get("success"):
        return {
            "success": True,
            "balance": result.get("balance", 0),
            "formatted": f"Rp {result.get('balance', 0):,.0f}"
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "Failed to check balance")
        }


@router.get("/products")
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category (Games, Pulsa, Data, E-Money)")
):
    """
    Get available products from DigiFlazz
    """
    result = await digiflazz_service.get_price_list(category=category)
    
    if result.get("success"):
        return {
            "success": True,
            "total": result.get("total", 0),
            "products": result.get("products", [])[:100]  # Limit to 100 products
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "Failed to get products")
        }


@router.get("/products/games")
async def get_game_products():
    """
    Get game voucher products only
    """
    result = await digiflazz_service.get_game_products()
    
    if result.get("success"):
        return {
            "success": True,
            "total": result.get("total", 0),
            "products": result.get("products", [])
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "Failed to get game products")
        }


@router.post("/topup", response_model=TopupResponse)
async def process_topup(request: TopupRequest):
    """
    Process a top-up transaction via DigiFlazz
    
    This will:
    1. Submit transaction to DigiFlazz
    2. Return success/pending/failed status
    3. For successful transactions, return serial number (SN) if applicable
    """
    # Generate unique ref_id
    ref_id = request.order_id or f"BLZ-{datetime.now().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
    
    result = await digiflazz_service.topup(
        ref_id=ref_id,
        buyer_sku_code=request.buyer_sku_code,
        customer_no=request.customer_no,
        testing=False  # Production mode
    )
    
    print(f"[Route] Topup result - success: {result.get('success')}, pending: {result.get('pending')}, status: {result.get('status')}")
    
    if result.get("success"):
        return TopupResponse(
            success=True,
            pending=False,
            message=result.get("message") or "Transaksi berhasil",
            data={
                "ref_id": result.get("ref_id"),
                "customer_no": result.get("customer_no"),
                "sn": result.get("sn"),
                "price": result.get("price"),
                "status": result.get("status"),
                "buyer_last_saldo": result.get("buyer_last_saldo")
            }
        )
    elif result.get("pending"):
        return TopupResponse(
            success=True,  # Pending is considered success in testing mode
            pending=True,
            message=result.get("message") or "Transaksi sedang diproses",
            data={
                "ref_id": result.get("ref_id"),
                "customer_no": result.get("customer_no"),
                "price": result.get("price"),
                "status": "pending",
                "buyer_last_saldo": result.get("buyer_last_saldo")
            }
        )
    else:
        return TopupResponse(
            success=False,
            pending=False,
            message=result.get("error") or result.get("message") or "Transaksi gagal",
            data=None
        )


@router.get("/status/{ref_id}")
async def check_transaction_status(
    ref_id: str,
    buyer_sku_code: str = Query(..., description="Product SKU code"),
    customer_no: str = Query(..., description="Customer number")
):
    """
    Check transaction status by ref_id
    """
    result = await digiflazz_service.check_transaction_status(
        ref_id=ref_id,
        buyer_sku_code=buyer_sku_code,
        customer_no=customer_no
    )
    
    return {
        "ref_id": ref_id,
        "status": result.get("status", "unknown"),
        "success": result.get("success", False),
        "pending": result.get("pending", False),
        "message": result.get("message", ""),
        "sn": result.get("sn", "")
    }


DIGIFLAZZ_WEBHOOK_SECRET = os.environ.get("DIGIFLAZZ_WEBHOOK_SECRET", "")


@router.post("/webhook")
async def digiflazz_webhook(request: Request):
    """
    DigiFlazz Webhook - receives transaction status updates.
    Verifies X-Hub-Signature (HMAC-SHA1) and updates order with SN/voucher code.
    
    Headers:
    - X-Digiflazz-Event: create | update
    - X-Hub-Signature: sha1=<hmac_hex>
    - User-Agent: Digiflazz-Hookshot (prepaid) | Digiflazz-Pasca-Hookshot (postpaid)
    """
    import hashlib as _hl, hmac as _hm

    raw_body = await request.body()
    body_str = raw_body.decode("utf-8")

    # Verify signature
    sig_header = request.headers.get("X-Hub-Signature", "")
    event_type = request.headers.get("X-Digiflazz-Event", "")
    user_agent = request.headers.get("User-Agent", "")

    if DIGIFLAZZ_WEBHOOK_SECRET and sig_header:
        expected = "sha1=" + _hm.new(DIGIFLAZZ_WEBHOOK_SECRET.encode(), raw_body, _hl.sha1).hexdigest()
        if sig_header != expected:
            logger.warning(f"[DigiFlazz Webhook] Invalid signature: got={sig_header} expected={expected}")
            return {"status": "invalid_signature"}

    try:
        payload = json.loads(body_str)
    except Exception:
        logger.error(f"[DigiFlazz Webhook] Invalid JSON body")
        return {"status": "invalid_body"}

    data = payload.get("data", {})
    ref_id = data.get("ref_id", "")
    customer_no = data.get("customer_no", "")
    sku = data.get("buyer_sku_code", "")
    message = data.get("message", "")
    status = data.get("status", "")
    rc = data.get("rc", "")
    sn = data.get("sn", "")
    price = data.get("price", 0)
    buyer_saldo = data.get("buyer_last_saldo", 0)

    is_postpaid = "Pasca" in user_agent
    trx_type = "postpaid" if is_postpaid else "prepaid"

    logger.info(
        f"[DigiFlazz Webhook] event={event_type} type={trx_type} ref={ref_id} "
        f"sku={sku} status={status} rc={rc} sn={sn} customer={customer_no}"
    )

    if not ref_id:
        logger.warning("[DigiFlazz Webhook] No ref_id in payload")
        return {"status": "ok"}

    # Build update for the order
    update = {
        "digiflazz_event": event_type,
        "digiflazz_status": status,
        "digiflazz_rc": rc,
        "digiflazz_sn": sn,
        "digiflazz_message": message,
        "digiflazz_price": price,
        "digiflazz_saldo": buyer_saldo,
        "digiflazz_type": trx_type,
        "digiflazz_webhook_at": datetime.now(timezone.utc).isoformat(),
        "digiflazz_raw": data,
    }

    if status == "Sukses":
        update["topup_status"] = "success"
        update["status"] = "completed"
        update["completed_at"] = datetime.now(timezone.utc).isoformat()
    elif status == "Pending":
        update["topup_status"] = "pending"
    elif status == "Gagal":
        update["topup_status"] = "failed"
        update["status"] = "failed"

    await _db.orders.update_one({"id": ref_id}, {"$set": update})
    logger.info(f"[DigiFlazz Webhook] Order {ref_id} updated: status={status} sn={sn}")

    return {"status": "ok"}


# ===================== CATALOG (cached DigiFlazz) =====================

import math

def _calc_sell_price(cost: float, margin_type: str, margin_value: float) -> int:
    """Calculate selling price from cost + margin. Returns rounded integer."""
    if margin_type == "percent":
        return math.ceil(cost * (1 + margin_value / 100))
    else:  # fixed
        return math.ceil(cost + margin_value)


def _get_input_config(raw_category: str, brand: str, desc: str) -> dict:
    """
    Determine what input fields to show based on DigiFlazz category/brand/desc.
    Returns config for frontend form.
    """
    desc_lower = (desc or "").lower()

    # Voucher types that don't need customer input (code returned as SN)
    no_input_brands = {"Steam Wallet (IDR)", "Nintendo eShop", "Unipin Voucher", "XBOX", "Razer Gold", "GOOGLE PLAY INDONESIA"}
    if brand in no_input_brands or (raw_category == "Voucher" and not desc_lower):
        return {
            "type": "voucher_code",
            "id_label": "Email (opsional)",
            "id_placeholder": "Email untuk menerima kode voucher",
            "id_required": False,
            "show_id2": False,
            "instruction": "Kode voucher akan ditampilkan setelah pembayaran berhasil. Tidak perlu memasukkan data tambahan.",
            "success_label": "Email",
        }

    # PLN
    if raw_category == "PLN" or brand == "PLN":
        return {
            "type": "pln",
            "id_label": "No. Meter / ID Pelanggan",
            "id_placeholder": "Masukkan nomor meter PLN",
            "id_required": True,
            "show_id2": False,
            "instruction": desc or "Masukkan nomor meter atau ID pelanggan PLN Anda.",
            "success_label": "No. Meter",
        }

    # Pulsa & Data
    if raw_category in ("Pulsa", "Data", "Aktivasi Voucher"):
        return {
            "type": "phone",
            "id_label": "Nomor HP",
            "id_placeholder": "Contoh: 08123456789",
            "id_required": True,
            "show_id2": False,
            "instruction": f"Masukkan nomor HP {brand} yang akan diisi pulsa/paket data.",
            "success_label": "Nomor HP",
        }

    # E-Money (GoPay, OVO, Dana, ShopeePay)
    if raw_category == "E-Money":
        return {
            "type": "phone",
            "id_label": "Nomor HP / Akun",
            "id_placeholder": "Masukkan nomor HP terdaftar",
            "id_required": True,
            "show_id2": False,
            "instruction": desc if desc and desc != "-" else f"Masukkan nomor HP yang terdaftar di {brand}.",
            "success_label": "Nomor HP",
        }

    # TV / Streaming
    if raw_category in ("TV", "Streaming"):
        return {
            "type": "customer_id",
            "id_label": "No. Pelanggan",
            "id_placeholder": "Masukkan nomor pelanggan",
            "id_required": True,
            "show_id2": False,
            "instruction": desc if desc and desc != "-" else "Masukkan nomor pelanggan Anda.",
            "success_label": "No. Pelanggan",
        }

    # Gas
    if raw_category == "Gas":
        return {
            "type": "customer_id",
            "id_label": "No. Pelanggan",
            "id_placeholder": "Masukkan nomor pelanggan gas",
            "id_required": True,
            "show_id2": False,
            "instruction": "Masukkan nomor pelanggan Pertamina Gas.",
            "success_label": "No. Pelanggan",
        }

    # Games - check if needs server ID
    needs_server = any(k in desc_lower for k in ["server", "zone", "gabungan"])
    hint = desc if desc and desc != "-" else "Masukkan User ID game Anda."

    return {
        "type": "game_id",
        "id_label": "User ID",
        "id_placeholder": "Masukkan User ID",
        "id_required": True,
        "show_id2": needs_server,
        "id2_label": "Server / Zone ID",
        "id2_placeholder": "Masukkan Server ID",
        "instruction": hint,
        "success_label": "User ID",
    }


@router.get("/pricing")
async def get_all_pricing():
    """Get margin settings for all brands"""
    pricing = await _db.brand_pricing.find({}, {"_id": 0}).to_list(200)
    return {"success": True, "pricing": pricing}


@router.put("/pricing/{brand_slug}")
async def set_brand_pricing(brand_slug: str, payload: dict):
    """
    Set margin for a brand.
    Body: { "margin_type": "percent"|"fixed", "margin_value": 10 }
    percent: sell = cost * (1 + value/100)
    fixed:   sell = cost + value
    """
    margin_type = payload.get("margin_type", "percent")
    margin_value = payload.get("margin_value", 10)

    if margin_type not in ("percent", "fixed"):
        raise HTTPException(status_code=400, detail="margin_type must be 'percent' or 'fixed'")

    all_brands = await _db.digiflazz_products.distinct("brand")
    brand_name = None
    for b in all_brands:
        if b.lower().replace(" ", "-").replace(":", "") == brand_slug:
            brand_name = b
            break
    if not brand_name:
        raise HTTPException(status_code=404, detail="Brand not found")

    await _db.brand_pricing.update_one(
        {"brand": brand_name},
        {"$set": {"brand": brand_name, "slug": brand_slug, "margin_type": margin_type, "margin_value": margin_value}},
        upsert=True,
    )
    return {"success": True, "brand": brand_name, "margin_type": margin_type, "margin_value": margin_value}


@router.put("/catalog/{brand_slug}/status")
async def toggle_brand_status(brand_slug: str, payload: dict):
    """
    Toggle brand active/inactive. Body: { "active": true/false }
    Inactive brands are hidden from customers on homepage.
    """
    active = payload.get("active", True)

    all_brands = await _db.digiflazz_products.distinct("brand")
    brand_name = None
    for b in all_brands:
        if b.lower().replace(" ", "-").replace(":", "") == brand_slug:
            brand_name = b
            break
    if not brand_name:
        raise HTTPException(status_code=404, detail="Brand not found")

    await _db.brand_status.update_one(
        {"brand": brand_name},
        {"$set": {"brand": brand_name, "slug": brand_slug, "active": active}},
        upsert=True,
    )
    return {"success": True, "brand": brand_name, "active": active}

@router.post("/catalog/sync")
async def sync_catalog():
    """Fetch ALL DigiFlazz prepaid products and cache in MongoDB"""
    result = await digiflazz_service.get_price_list()
    if not result.get("success"):
        return {"success": False, "error": result.get("error", "Failed to fetch")}

    products = result.get("products", [])
    if not products:
        return {"success": False, "error": "No products returned"}

    # Store each product
    count = 0
    for p in products:
        if not isinstance(p, dict):
            continue
        await _db.digiflazz_products.update_one(
            {"buyer_sku_code": p.get("buyer_sku_code")},
            {"$set": {**p, "cached_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )
        count += 1

    await _db.digiflazz_meta.update_one(
        {"key": "last_sync"},
        {"$set": {"key": "last_sync", "at": datetime.now(timezone.utc).isoformat(), "count": count}},
        upsert=True,
    )
    return {"success": True, "synced": count}


@router.get("/catalog")
async def get_catalog(show_all: bool = False):
    """
    Return cached DigiFlazz products grouped by brand.
    show_all=true returns inactive brands too (for admin).
    """
    # Try cache first
    products = await _db.digiflazz_products.find(
        {"seller_product_status": True},
        {"_id": 0},
    ).to_list(500)

    # If cache empty, try a live fetch (all prepaid)
    if not products:
        result = await digiflazz_service.get_price_list()
        if result.get("success"):
            products = [p for p in result.get("products", []) if isinstance(p, dict) and p.get("seller_product_status")]
            for p in products:
                await _db.digiflazz_products.update_one(
                    {"buyer_sku_code": p.get("buyer_sku_code")},
                    {"$set": {**p, "cached_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True,
                )

    if not products:
        return {"success": True, "brands": [], "total": 0}

    # Load custom icons
    custom_icons = {}
    async for ci in _db.brand_icons.find({}, {"_id": 0}):
        custom_icons[ci["brand"]] = ci["icon"]

    # Load pricing/margin settings
    pricing_map = {}
    async for pr in _db.brand_pricing.find({}, {"_id": 0}):
        pricing_map[pr["brand"]] = pr

    # Load brand active status
    status_map = {}
    async for bs in _db.brand_status.find({}, {"_id": 0}):
        status_map[bs["brand"]] = bs.get("active", True)

    # Group by brand
    brands_map = {}
    for p in products:
        brand = p.get("brand", "Other")
        if brand not in brands_map:
            raw_cat = p.get("category", "Games")
            mapped_cat = BRAND_CATEGORY_OVERRIDE.get(brand, CATEGORY_MAP.get(raw_cat, "games"))
            pr = pricing_map.get(brand, {})
            is_active = status_map.get(brand, True)
            brands_map[brand] = {
                "brand": brand,
                "slug": brand.lower().replace(" ", "-").replace(":", ""),
                "image": custom_icons.get(brand) or BRAND_IMAGES.get(brand, f"https://ui-avatars.com/api/?name={brand[:2]}&background=FF0000&color=fff&size=200&bold=true&font-size=0.5"),
                "category": mapped_cat,
                "margin_type": pr.get("margin_type", "percent"),
                "margin_value": pr.get("margin_value", 10),
                "active": is_active,
                "items": [],
            }

        cost = p.get("price", 0)
        pr = pricing_map.get(brand, {})
        sell = _calc_sell_price(cost, pr.get("margin_type", "percent"), pr.get("margin_value", 10))

        brands_map[brand]["items"].append({
            "sku": p.get("buyer_sku_code"),
            "name": p.get("product_name"),
            "cost": cost,
            "price": sell,
            "active": p.get("seller_product_status", False),
        })

    # Sort brands by item count (most popular first)
    brands = sorted(brands_map.values(), key=lambda b: len(b["items"]), reverse=True)

    # Filter out inactive brands for customer view
    if not show_all:
        brands = [b for b in brands if b.get("active", True)]

    return {"success": True, "brands": brands, "total": len(brands)}


@router.get("/catalog/{brand_slug}")
async def get_brand_products(brand_slug: str):
    """Return all active products for a specific brand."""
    all_brands = await _db.digiflazz_products.distinct("brand")
    brand_name = None
    for b in all_brands:
        if b.lower().replace(" ", "-").replace(":", "") == brand_slug:
            brand_name = b
            break

    if not brand_name:
        raise HTTPException(status_code=404, detail="Brand not found")

    products = await _db.digiflazz_products.find(
        {"brand": brand_name, "seller_product_status": True},
        {"_id": 0},
    ).sort("price", 1).to_list(100)

    # Check for custom icon & pricing
    custom = await _db.brand_icons.find_one({"brand": brand_name}, {"_id": 0})
    image = (custom or {}).get("icon") or BRAND_IMAGES.get(brand_name, f"https://ui-avatars.com/api/?name={brand_name[:2]}&background=FF0000&color=fff&size=200&bold=true&font-size=0.5")

    pr = await _db.brand_pricing.find_one({"brand": brand_name}, {"_id": 0}) or {}
    mt = pr.get("margin_type", "percent")
    mv = pr.get("margin_value", 10)

    # Determine category & input config
    raw_cat = products[0].get("category", "Games") if products else "Games"
    category = BRAND_CATEGORY_OVERRIDE.get(brand_name, CATEGORY_MAP.get(raw_cat, "games"))

    # Get first product desc as hint for customer input
    first_desc = ""
    for p in products:
        d = (p.get("desc") or "").strip()
        if d and d != "-":
            first_desc = d
            break

    # Determine input type from DigiFlazz category
    input_config = _get_input_config(raw_cat, brand_name, first_desc)

    return {
        "success": True,
        "brand": brand_name,
        "slug": brand_slug,
        "image": image,
        "category": category,
        "raw_category": raw_cat,
        "margin_type": mt,
        "margin_value": mv,
        "input_config": input_config,
        "products": [{
            "sku": p.get("buyer_sku_code"),
            "name": p.get("product_name"),
            "cost": p.get("price", 0),
            "price": _calc_sell_price(p.get("price", 0), mt, mv),
            "desc": p.get("desc", ""),
        } for p in products],
    }


@router.put("/catalog/{brand_slug}/icon")
async def update_brand_icon(brand_slug: str, payload: dict):
    """Update icon URL for a brand. Body: { "icon": "https://..." }"""
    icon_url = payload.get("icon", "").strip()
    if not icon_url:
        raise HTTPException(status_code=400, detail="icon URL required")

    all_brands = await _db.digiflazz_products.distinct("brand")
    brand_name = None
    for b in all_brands:
        if b.lower().replace(" ", "-").replace(":", "") == brand_slug:
            brand_name = b
            break
    if not brand_name:
        raise HTTPException(status_code=404, detail="Brand not found")

    await _db.brand_icons.update_one(
        {"brand": brand_name},
        {"$set": {"brand": brand_name, "slug": brand_slug, "icon": icon_url}},
        upsert=True,
    )
    return {"success": True, "brand": brand_name, "icon": icon_url}
