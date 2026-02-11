"""
DigiFlazz Biller Routes
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
import uuid

from services.digiflazz import digiflazz_service

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
    """
    Webhook endpoint for DigiFlazz callbacks
    Whitelist DigiFlazz IP: 52.74.250.133
    """
    print(f"DigiFlazz Webhook received: {payload}")
    
    # Extract transaction data
    data = payload.get("data", {})
    ref_id = data.get("ref_id")
    status = data.get("status")
    sn = data.get("sn")
    message = data.get("message")
    
    # TODO: Update order status in database based on webhook
    # await update_order_from_webhook(ref_id, status, sn, message)
    
    return {"status": "ok"}
