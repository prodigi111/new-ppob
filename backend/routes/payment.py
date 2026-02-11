"""
Payment Routes - Ayolinx Payment Gateway Integration
"""
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
import json

from services.ayolinx import ayolinx_service

router = APIRouter(prefix="/payment", tags=["Payment"])


class CreatePaymentRequest(BaseModel):
    order_id: str = Field(..., description="Unique order ID")
    amount: float = Field(..., gt=0, description="Payment amount in IDR")
    customer_name: str = Field(..., min_length=1, max_length=50)
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    payment_method: Literal["va", "qris"] = Field(default="va", description="Payment method")
    va_channel: Optional[str] = Field(default="bni", description="VA bank channel (bca, bni, bri, mandiri, permata, cimb)")


class PaymentResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


@router.post("/create", response_model=PaymentResponse)
async def create_payment(request: CreatePaymentRequest):
    """
    Create a new payment transaction
    
    Supports:
    - Virtual Account (BCA, BNI, BRI, Mandiri, Permata, CIMB)
    - QRIS
    """
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
        else:
            raise HTTPException(status_code=400, detail="Invalid payment method")
        
        if result.get("success"):
            # Remove raw_response from client response
            data = {k: v for k, v in result.items() if k != "raw_response"}
            return PaymentResponse(
                success=True,
                message="Payment created successfully",
                data=data
            )
        else:
            return PaymentResponse(
                success=False,
                message=result.get("error", "Failed to create payment"),
                data=None
            )
    
    except Exception as e:
        print(f"Error creating payment: {e}")
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


@router.post("/callback/va")
async def va_payment_callback(request: Request):
    """
    Webhook endpoint for Virtual Account payment notifications from Ayolinx
    """
    try:
        # Get headers
        signature = request.headers.get("X-SIGNATURE", "")
        timestamp = request.headers.get("X-TIMESTAMP", "")
        
        # Get body
        body = await request.body()
        body_str = body.decode("utf-8")
        data = json.loads(body_str)
        
        # Verify signature (optional in sandbox)
        # is_valid = ayolinx_service.verify_callback_signature(
        #     signature=signature,
        #     method="POST",
        #     url="/api/payment/callback/va",
        #     body=body_str,
        #     timestamp=timestamp
        # )
        
        # Extract payment info
        trx_id = data.get("trxId") or data.get("partnerReferenceNo")
        paid_amount = data.get("paidAmount", {}).get("value", "0")
        payment_status = data.get("paymentFlagStatus", "")
        
        print(f"VA Payment Callback - TrxID: {trx_id}, Amount: {paid_amount}, Status: {payment_status}")
        
        # TODO: Update order status in database
        # await update_order_payment_status(trx_id, payment_status, paid_amount)
        
        # Return success response to Ayolinx
        return {
            "responseCode": "2002500",
            "responseMessage": "Success"
        }
    
    except Exception as e:
        print(f"Error processing VA callback: {e}")
        return {
            "responseCode": "5002500",
            "responseMessage": str(e)
        }


@router.post("/callback/qris")
async def qris_payment_callback(request: Request):
    """
    Webhook endpoint for QRIS payment notifications from Ayolinx
    """
    try:
        body = await request.body()
        data = json.loads(body.decode("utf-8"))
        
        # Extract payment info
        reference_no = data.get("originalReferenceNo")
        partner_reference = data.get("originalPartnerReferenceNo")
        amount = data.get("amount", {}).get("value", "0")
        status = data.get("latestTransactionStatus")
        
        print(f"QRIS Payment Callback - Ref: {reference_no}, Amount: {amount}, Status: {status}")
        
        # TODO: Update order status in database
        
        return {
            "responseCode": "2005100",
            "responseMessage": "Success"
        }
    
    except Exception as e:
        print(f"Error processing QRIS callback: {e}")
        return {
            "responseCode": "5005100",
            "responseMessage": str(e)
        }


@router.get("/status/{order_id}")
async def check_payment_status(order_id: str):
    """
    Check payment status for an order
    """
    # TODO: Implement status check via Ayolinx API or from database
    return {
        "order_id": order_id,
        "status": "pending",
        "message": "Payment status check - implement with database"
    }
