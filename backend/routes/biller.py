"""
DigiFlazz Biller Routes
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os
import logging

from services.digiflazz import digiflazz_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/biller", tags=["Biller"])

# DB access
_client = AsyncIOMotorClient(os.environ['MONGO_URL'])
_db = _client[os.environ['DB_NAME']]

# Brand image mapping for popular games
BRAND_IMAGES = {
    "MOBILE LEGENDS": "https://ui-avatars.com/api/?name=ML&background=4267B2&color=fff&size=200&bold=true&font-size=0.4",
    "FREE FIRE": "https://ui-avatars.com/api/?name=FF&background=FF6B00&color=fff&size=200&bold=true&font-size=0.4",
    "PUBG MOBILE": "https://play-lh.googleusercontent.com/JRd05pyBH41qjgsJuWduRJpDeZG0Hnb0yjf2nWqO7VaGKL10-G5UIygxED-WNOc3pg=w240-h480-rw",
    "GENSHIN IMPACT": "https://ui-avatars.com/api/?name=GI&background=6366F1&color=fff&size=200&bold=true&font-size=0.4",
    "Genshin Impact": "https://ui-avatars.com/api/?name=GI&background=6366F1&color=fff&size=200&bold=true&font-size=0.4",
    "VALORANT": "https://ui-avatars.com/api/?name=VA&background=FF4655&color=fff&size=200&bold=true&font-size=0.4",
    "Valorant": "https://ui-avatars.com/api/?name=VA&background=FF4655&color=fff&size=200&bold=true&font-size=0.4",
    "HONKAI STAR RAIL": "https://ui-avatars.com/api/?name=HSR&background=9333EA&color=fff&size=200&bold=true&font-size=0.4",
    "Call of Duty MOBILE": "https://ui-avatars.com/api/?name=COD&background=1a1a1a&color=fff&size=200&bold=true&font-size=0.4",
    "CALL OF DUTY": "https://ui-avatars.com/api/?name=COD&background=1a1a1a&color=fff&size=200&bold=true&font-size=0.4",
    "ARENA OF VALOR": "https://ui-avatars.com/api/?name=AOV&background=0066cc&color=fff&size=200&bold=true&font-size=0.4",
    "RAGNAROK": "https://ui-avatars.com/api/?name=RO&background=663399&color=fff&size=200&bold=true&font-size=0.4",
    "POINT BLANK": "https://ui-avatars.com/api/?name=PB&background=cc3300&color=fff&size=200&bold=true&font-size=0.4",
    "GARENA": "https://ui-avatars.com/api/?name=GR&background=E14B00&color=fff&size=200&bold=true&font-size=0.4",
    "Nintendo eShop": "https://ui-avatars.com/api/?name=NS&background=E60012&color=fff&size=200&bold=true&font-size=0.4",
    "Unipin Voucher": "https://ui-avatars.com/api/?name=UP&background=FFB800&color=000&size=200&bold=true&font-size=0.4",
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
        testing=True  # Set to False for production
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


@router.post("/webhook")
async def digiflazz_webhook(payload: dict):
    """Webhook endpoint for DigiFlazz callbacks"""
    logger.info(f"DigiFlazz Webhook received: {payload}")
    data = payload.get("data", {})
    ref_id = data.get("ref_id")
    status = data.get("status")
    sn = data.get("sn")

    if ref_id:
        update = {"digiflazz_status": status, "digiflazz_sn": sn}
        if status == "Sukses":
            update["status"] = "completed"
            update["completed_at"] = datetime.now(timezone.utc).isoformat()
        elif status == "Gagal":
            update["status"] = "failed"
        await _db.orders.update_one({"id": ref_id}, {"$set": update})

    return {"status": "ok"}


# ===================== CATALOG (cached DigiFlazz) =====================

@router.post("/catalog/sync")
async def sync_catalog():
    """Fetch DigiFlazz game products and cache in MongoDB"""
    result = await digiflazz_service.get_game_products()
    if not result.get("success"):
        return {"success": False, "error": result.get("error", "Failed to fetch")}

    products = result.get("products", [])
    if not products:
        return {"success": False, "error": "No products returned"}

    # Store each product
    for p in products:
        if not isinstance(p, dict):
            continue
        await _db.digiflazz_products.update_one(
            {"buyer_sku_code": p.get("buyer_sku_code")},
            {"$set": {**p, "cached_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )

    await _db.digiflazz_meta.update_one(
        {"key": "last_sync"},
        {"$set": {"key": "last_sync", "at": datetime.now(timezone.utc).isoformat(), "count": len(products)}},
        upsert=True,
    )
    return {"success": True, "synced": len(products)}


@router.get("/catalog")
async def get_catalog():
    """
    Return cached DigiFlazz game products grouped by brand.
    Frontend uses this for the homepage product grid.
    """
    # Try cache first
    products = await _db.digiflazz_products.find(
        {"seller_product_status": True},
        {"_id": 0},
    ).to_list(500)

    # If cache empty, try a live fetch
    if not products:
        result = await digiflazz_service.get_game_products()
        if result.get("success"):
            products = [p for p in result.get("products", []) if isinstance(p, dict) and p.get("seller_product_status")]
            # Cache them
            for p in products:
                await _db.digiflazz_products.update_one(
                    {"buyer_sku_code": p.get("buyer_sku_code")},
                    {"$set": {**p, "cached_at": datetime.now(timezone.utc).isoformat()}},
                    upsert=True,
                )

    if not products:
        return {"success": True, "brands": [], "total": 0}

    # Group by brand
    brands_map = {}
    for p in products:
        brand = p.get("brand", "Other")
        if brand not in brands_map:
            brands_map[brand] = {
                "brand": brand,
                "slug": brand.lower().replace(" ", "-").replace(":", ""),
                "image": BRAND_IMAGES.get(brand, f"https://ui-avatars.com/api/?name={brand[:2]}&background=FF0000&color=fff&size=200&bold=true&font-size=0.5"),
                "category": p.get("category", "Games"),
                "items": [],
            }
        brands_map[brand]["items"].append({
            "sku": p.get("buyer_sku_code"),
            "name": p.get("product_name"),
            "price": p.get("price", 0),
            "active": p.get("seller_product_status", False),
        })

    # Sort brands by item count (most popular first)
    brands = sorted(brands_map.values(), key=lambda b: len(b["items"]), reverse=True)

    return {"success": True, "brands": brands, "total": len(brands)}


@router.get("/catalog/{brand_slug}")
async def get_brand_products(brand_slug: str):
    """
    Return all active products for a specific brand.
    Frontend uses this for the product detail / denomination page.
    """
    # Reconstruct brand name from slug
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

    return {
        "success": True,
        "brand": brand_name,
        "slug": brand_slug,
        "image": BRAND_IMAGES.get(brand_name, f"https://ui-avatars.com/api/?name={brand_name[:2]}&background=FF0000&color=fff&size=200&bold=true&font-size=0.5"),
        "products": [{
            "sku": p.get("buyer_sku_code"),
            "name": p.get("product_name"),
            "price": p.get("price", 0),
            "desc": p.get("desc", ""),
        } for p in products],
    }
