"""
Payment Routes - Ayolinx Payment Gateway Integration
Handles: payment creation, webhooks/callbacks, status checks
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
import logging

from services.ayolinx import ayolinx_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Payment"])

# DB access (same connection as server.py)
mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

# Ayolinx callback status mapping
CALLBACK_STATUS_MAP = {
    "00": "completed",
    "01": "pending",
    "02": "processing",
    "03": "pending",
    "04": "refunded",
    "05": "cancelled",
    "06": "failed",
    "07": "failed",
}


class CreatePaymentRequest(BaseModel):
    order_id: str = Field(..., description="Unique order ID")
    amount: float = Field(..., gt=0, description="Payment amount in IDR")
    customer_name: str = Field(..., min_length=1, max_length=50)
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: Literal["va", "qris", "payment_link"] = Field(default="va")
    va_channel: Optional[str] = Field(default="bni")
    item_name: Optional[str] = None


class PaymentResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/create", response_model=PaymentResponse)
async def create_payment(request: CreatePaymentRequest):
    """Create a new payment transaction (VA / QRIS / Payment Link)"""
    try:
        if request.payment_method == "va":
            result = await ayolinx_service.create_virtual_account(
                order_id=request.order_id,
                amount=request.amount,
                customer_name=request.customer_name,
                channel=request.va_channel or "bni",
                customer_email=request.customer_email or "",
                customer_phone=request.customer_phone or ""
            )
        elif request.payment_method == "qris":
            result = await ayolinx_service.generate_qris(
                order_id=request.order_id,
                amount=request.amount,
                customer_name=request.customer_name
            )
        elif request.payment_method == "payment_link":
            result = await ayolinx_service.create_payment_link(
                order_id=request.order_id,
                amount=request.amount,
                customer_name=request.customer_name,
                customer_email=request.customer_email or "customer@blazestore.id",
                customer_phone=request.customer_phone or "81234567890",
                item_name=request.item_name or "BlazeStore Top Up",
                callback_url=""
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid payment method")

        if result.get("success"):
            data = {k: v for k, v in result.items() if k != "raw_response"}

            # Store payment info in orders collection
            await _db.orders.update_one(
                {"id": request.order_id},
                {"$set": {
                    "payment_gateway": "ayolinx",
                    "payment_method_detail": request.payment_method,
                    "payment_channel": request.va_channel if request.payment_method == "va" else request.payment_method,
                    "payment_data": data,
                }},
                upsert=False
            )

            return PaymentResponse(success=True, message="Payment created successfully", data=data)
        else:
            return PaymentResponse(success=False, message=result.get("error", "Failed to create payment"), data=None)

    except Exception as e:
        logger.error(f"Error creating payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/channels")
async def get_payment_channels():
    """Get available payment channels"""
    return {
        "virtual_account": [
            {"code": "bca", "name": "BCA Virtual Account", "icon": "bca"},
            {"code": "bni", "name": "BNI Virtual Account", "icon": "bni"},
            {"code": "bri", "name": "BRI Virtual Account", "icon": "bri"},
            {"code": "mandiri", "name": "Mandiri Virtual Account", "icon": "mandiri"},
            {"code": "permata", "name": "Permata Virtual Account", "icon": "permata"},
            {"code": "cimb", "name": "CIMB Niaga Virtual Account", "icon": "cimb"},
        ],
        "qris": {
            "code": "qris",
            "name": "QRIS",
            "description": "Scan QR untuk bayar dari semua e-wallet & m-banking",
            "icon": "qris"
        }
    }


async def _process_callback(data: dict, source: str) -> dict:
    """
    Unified callback processor for all Ayolinx payment notifications.
    Extracts order info from callback payload and updates order status in DB.
    
    Callback payload fields:
    - callbackType: "payment" | "settlement"
    - latestTransactionStatus: "00"=success, "06"=failed, etc.
    - originalPartnerReferenceNo: our order_id / trxId
    - originalReferenceNo: Ayolinx reference
    - amount: { value, currency }
    - finishedTime: ISO timestamp
    - additionalInfo: { channel, plh? }
    """
    callback_type = data.get("callbackType", "payment")
    status_code = data.get("latestTransactionStatus", "")
    order_id = data.get("originalPartnerReferenceNo", "")
    ayolinx_ref = data.get("originalReferenceNo", "")
    amount = data.get("amount", {})
    finished_time = data.get("finishedTime", "")
    channel = data.get("additionalInfo", {}).get("channel", "")

    mapped_status = CALLBACK_STATUS_MAP.get(status_code, "pending")

    logger.info(
        f"[Callback/{source}] type={callback_type} order={order_id} "
        f"status={status_code}→{mapped_status} ref={ayolinx_ref} channel={channel}"
    )

    if not order_id:
        logger.warning(f"[Callback/{source}] No order_id in payload")
        return {"updated": False, "reason": "missing order_id"}

    # Build update document
    update_fields = {
        "payment_status_code": status_code,
        "payment_ayolinx_ref": ayolinx_ref,
        "payment_callback_channel": channel,
        "payment_callback_raw": data,
        "payment_callback_at": datetime.now(timezone.utc).isoformat(),
    }

    if mapped_status == "completed":
        update_fields["status"] = "completed"
        update_fields["completed_at"] = finished_time or datetime.now(timezone.utc).isoformat()
    elif mapped_status == "failed":
        update_fields["status"] = "failed"
    elif mapped_status in ("cancelled", "refunded"):
        update_fields["status"] = mapped_status
    else:
        update_fields["status"] = "processing"

    # Try matching by trxId (VA) or partnerReferenceNo (QRIS/PaymentLink)
    result = await _db.orders.update_one(
        {"$or": [{"id": order_id}, {"order_number": order_id}]},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        # Also try matching payment_data.order_id or payment_data.trx_id
        result = await _db.orders.update_one(
            {"$or": [
                {"payment_data.order_id": order_id},
                {"payment_data.trx_id": order_id},
            ]},
            {"$set": update_fields}
        )

    updated = result.matched_count > 0
    logger.info(f"[Callback/{source}] order={order_id} updated={updated}")
    return {"updated": updated, "status": mapped_status}


@router.post("/callback/notify")
async def unified_payment_callback(request: Request):
    """
    Unified webhook endpoint for ALL Ayolinx payment notifications.
    Handles VA, QRIS, and Payment Link callbacks in one place.
    Configure this URL in Ayolinx merchant dashboard.
    """
    try:
        body = await request.body()
        body_str = body.decode("utf-8")
        data = json.loads(body_str)

        result = await _process_callback(data, source="notify")

        return {"responseCode": "2005600", "responseMessage": "Successful"}

    except Exception as e:
        logger.error(f"Error processing callback: {e}")
        return {"responseCode": "5005600", "responseMessage": str(e)}


@router.post("/callback/va")
async def va_payment_callback(request: Request):
    """Webhook for Virtual Account payment notifications"""
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))

        await _process_callback(data, source="va")

        return {"responseCode": "2002500", "responseMessage": "Success"}

    except Exception as e:
        logger.error(f"Error processing VA callback: {e}")
        return {"responseCode": "5002500", "responseMessage": str(e)}


@router.post("/callback/qris")
async def qris_payment_callback(request: Request):
    """Webhook for QRIS payment notifications"""
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))

        await _process_callback(data, source="qris")

        return {"responseCode": "2005100", "responseMessage": "Success"}

    except Exception as e:
        logger.error(f"Error processing QRIS callback: {e}")
        return {"responseCode": "5005100", "responseMessage": str(e)}


@router.post("/callback/link")
async def payment_link_callback(request: Request):
    """Webhook for Payment Link notifications"""
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))

        await _process_callback(data, source="payment_link")

        return {"responseCode": "2005600", "responseMessage": "Successful"}

    except Exception as e:
        logger.error(f"Error processing Payment Link callback: {e}")
        return {"responseCode": "5005600", "responseMessage": str(e)}


@router.get("/status/{order_id}")
async def check_payment_status(order_id: str):
    """Check payment status for an order from database"""
    order = await _db.orders.find_one(
        {"$or": [{"id": order_id}, {"order_number": order_id}]},
        {"_id": 0}
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return {
        "order_id": order_id,
        "status": order.get("status", "pending"),
        "payment_method": order.get("payment_method_detail", order.get("payment_method", "")),
        "payment_channel": order.get("payment_callback_channel", order.get("payment_channel", "")),
        "payment_status_code": order.get("payment_status_code", ""),
        "completed_at": order.get("completed_at"),
        "payment_data": order.get("payment_data"),
    }
