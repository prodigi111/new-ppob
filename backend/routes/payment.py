"""
Payment Routes - Ayolinx Payment Gateway Integration
Handles: payment creation, webhooks/callbacks, status checks, auto top-up
"""
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import json
import os
import uuid
import logging

from services.ayolinx import ayolinx_service
from services.digiflazz import digiflazz_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment", tags=["Payment"])

mongo_url = os.environ['MONGO_URL']
_client = AsyncIOMotorClient(mongo_url)
_db = _client[os.environ['DB_NAME']]

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
    # DigiFlazz fields for auto top-up
    digiflazz_sku: Optional[str] = None
    customer_game_id: Optional[str] = None


class PaymentResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/create", response_model=PaymentResponse)
async def create_payment(request: CreatePaymentRequest):
    """Create a new payment transaction (VA / QRIS / Payment Link)"""
    try:
        # Store DigiFlazz fields FIRST (before Ayolinx call)
        if request.digiflazz_sku or request.customer_game_id:
            pre_update = {}
            if request.digiflazz_sku:
                pre_update["digiflazz_sku"] = request.digiflazz_sku
            if request.customer_game_id:
                pre_update["digiflazz_customer_no"] = request.customer_game_id
            await _db.orders.update_one({"id": request.order_id}, {"$set": pre_update})

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

            # Store payment info in order
            update_doc = {
                "payment_gateway": "ayolinx",
                "payment_method_detail": request.payment_method,
                "payment_channel": request.va_channel if request.payment_method == "va" else request.payment_method,
                "payment_data": data,
            }

            await _db.orders.update_one(
                {"id": request.order_id},
                {"$set": update_doc},
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


async def _trigger_digiflazz_topup(order_id: str):
    """
    Auto top-up via DigiFlazz after successful payment.
    Reads digiflazz_sku and game_user_id from the order, then calls DigiFlazz API.
    """
    order = await _db.orders.find_one(
        {"$or": [{"id": order_id}, {"payment_data.order_id": order_id}, {"payment_data.trx_id": order_id}]},
        {"_id": 0}
    )
    if not order:
        logger.warning(f"[AutoTopup] Order {order_id} not found")
        return

    sku = order.get("digiflazz_sku") or order.get("denomination_id")
    customer_no = order.get("digiflazz_customer_no") or order.get("game_user_id")

    if not sku or not customer_no:
        logger.info(f"[AutoTopup] Order {order_id} has no DigiFlazz SKU or customer_no, skipping")
        return

    # Skip if already topped up
    if order.get("digiflazz_status"):
        logger.info(f"[AutoTopup] Order {order_id} already processed by DigiFlazz: {order.get('digiflazz_status')}")
        return

    ref_id = order.get("id", order_id)
    logger.info(f"[AutoTopup] Triggering DigiFlazz: sku={sku} customer={customer_no} ref={ref_id}")

    await _db.orders.update_one(
        {"id": ref_id},
        {"$set": {"digiflazz_status": "submitting", "digiflazz_submitted_at": datetime.now(timezone.utc).isoformat()}}
    )

    result = await digiflazz_service.topup(
        ref_id=ref_id,
        buyer_sku_code=sku,
        customer_no=customer_no,
        testing=True  # Set to False for production
    )

    update = {
        "digiflazz_response": {k: v for k, v in result.items() if k != "raw_response"},
        "digiflazz_status": result.get("status", "unknown"),
        "digiflazz_sn": result.get("sn", ""),
        "digiflazz_completed_at": datetime.now(timezone.utc).isoformat(),
    }

    if result.get("success"):
        update["topup_status"] = "success"
        logger.info(f"[AutoTopup] SUCCESS for {ref_id}: sn={result.get('sn')}")
    elif result.get("pending"):
        update["topup_status"] = "pending"
        logger.info(f"[AutoTopup] PENDING for {ref_id}")
    else:
        update["topup_status"] = "failed"
        update["topup_error"] = result.get("error", result.get("message", ""))
        logger.error(f"[AutoTopup] FAILED for {ref_id}: {result.get('error')}")

    await _db.orders.update_one({"id": ref_id}, {"$set": update})


async def _process_callback(data: dict, source: str) -> dict:
    """
    Unified callback processor for all Ayolinx payment notifications.
    On successful payment (status 00), triggers DigiFlazz auto top-up.
    """
    callback_type = data.get("callbackType", "payment")
    status_code = data.get("latestTransactionStatus", "")
    order_id = data.get("originalPartnerReferenceNo", "")
    ayolinx_ref = data.get("originalReferenceNo", "")
    finished_time = data.get("finishedTime", "")
    channel = data.get("additionalInfo", {}).get("channel", "")

    mapped_status = CALLBACK_STATUS_MAP.get(status_code, "pending")

    logger.info(
        f"[Callback/{source}] type={callback_type} order={order_id} "
        f"status={status_code}->{mapped_status} ref={ayolinx_ref} channel={channel}"
    )

    if not order_id:
        logger.warning(f"[Callback/{source}] No order_id in payload")
        return {"updated": False, "reason": "missing order_id"}

    update_fields = {
        "payment_status_code": status_code,
        "payment_ayolinx_ref": ayolinx_ref,
        "payment_callback_channel": channel,
        "payment_callback_raw": data,
        "payment_callback_at": datetime.now(timezone.utc).isoformat(),
    }

    if mapped_status == "completed":
        update_fields["status"] = "paid"  # paid (not completed yet — completed after top-up)
        update_fields["paid_at"] = finished_time or datetime.now(timezone.utc).isoformat()
    elif mapped_status == "failed":
        update_fields["status"] = "failed"
    elif mapped_status in ("cancelled", "refunded"):
        update_fields["status"] = mapped_status
    else:
        update_fields["status"] = "processing"

    # Update order
    result = await _db.orders.update_one(
        {"$or": [{"id": order_id}, {"order_number": order_id}]},
        {"$set": update_fields}
    )

    if result.matched_count == 0:
        result = await _db.orders.update_one(
            {"$or": [{"payment_data.order_id": order_id}, {"payment_data.trx_id": order_id}]},
            {"$set": update_fields}
        )

    updated = result.matched_count > 0
    logger.info(f"[Callback/{source}] order={order_id} updated={updated} status={mapped_status}")

    # AUTO TOP-UP: If payment succeeded, trigger DigiFlazz
    if mapped_status == "completed" and updated:
        try:
            await _trigger_digiflazz_topup(order_id)
        except Exception as e:
            logger.error(f"[Callback/{source}] Auto top-up error for {order_id}: {e}")

    return {"updated": updated, "status": mapped_status}


@router.post("/callback/notify")
async def unified_payment_callback(request: Request):
    """Unified webhook for ALL Ayolinx payment notifications."""
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))
        await _process_callback(data, source="notify")
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
    """Check payment + top-up status for an order"""
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
        "paid_at": order.get("paid_at"),
        "completed_at": order.get("completed_at"),
        "payment_data": order.get("payment_data"),
        "topup_status": order.get("topup_status"),
        "digiflazz_status": order.get("digiflazz_status"),
        "digiflazz_sn": order.get("digiflazz_sn"),
    }
