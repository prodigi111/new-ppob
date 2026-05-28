"""
Public webhook forwarder.

Receives webhooks from Ayolinx & DigiFlazz, extracts the 3-letter prefix from the
order/ref ID, looks up the routing config in DB, and forwards the RAW body +
preserved headers to the destination site.

All requests are logged (success/failure/dropped) for inspection & replay.
"""
import os
import json
import uuid
import httpx
import logging
from datetime import datetime, timezone
from typing import Optional, Tuple
from fastapi import APIRouter, Request

from db import db, prune_old_logs

logger = logging.getLogger(__name__)

router = APIRouter(tags=["forwarder"])

FORWARD_TIMEOUT = float(os.environ.get('FORWARD_TIMEOUT_SECONDS', '15'))
LOG_RETENTION = int(os.environ.get('LOG_RETENTION', '2000'))

# Headers that must NOT be forwarded (hop-by-hop or auto-set)
HOP_BY_HOP = {
    "host", "content-length", "connection", "transfer-encoding",
    "accept-encoding", "keep-alive", "te", "trailer", "upgrade", "proxy-connection",
}

# Ayolinx channel response codes
AYOLINX_RESPONSES = {
    "qris":   ("2005100", "Success"),
    "va":     ("2002500", "Success"),
    "notify": ("2005600", "Successful"),
    "link":   ("2005600", "Successful"),
}


def _safe_headers(headers) -> dict:
    return {k: v for k, v in headers.items() if k.lower() not in HOP_BY_HOP}


def _extract_ayolinx_ref(payload: dict) -> str:
    return (payload.get("originalPartnerReferenceNo") or "").strip()


def _extract_digiflazz_ref(payload: dict) -> str:
    # DigiFlazz wraps data under "data"
    data = payload.get("data") or {}
    return (data.get("ref_id") or "").strip()


async def _log_callback(entry: dict):
    """Insert a log row + opportunistic pruning."""
    try:
        await db.callback_logs.insert_one(entry)
        # Prune ~1% of the time to keep size bounded without locking on every insert
        if uuid.uuid4().int % 100 == 0:
            await prune_old_logs(LOG_RETENTION)
    except Exception as e:
        logger.error(f"Failed to write callback log: {e}")


async def _forward(
    *,
    source_type: str,            # "ayolinx" | "digiflazz"
    channel: str,                # "qris" | "va" | "notify" | "link" | "webhook"
    raw_body: bytes,
    headers: dict,
    payload: dict,
    ref_id: str,
) -> Tuple[Optional[int], Optional[str], Optional[str], Optional[str]]:
    """
    Returns (status_code, response_body, target_url, error).
    target_url=None means dropped (no matching active route).
    """
    log_id = str(uuid.uuid4())
    started = datetime.now(timezone.utc)

    if len(ref_id) < 3:
        await _log_callback({
            "id": log_id,
            "type": source_type,
            "channel": channel,
            "prefix": None,
            "ref_id": ref_id or None,
            "payload": payload,
            "raw_body": raw_body.decode("utf-8", errors="replace"),
            "headers": headers,
            "target_url": None,
            "status_code": None,
            "response_body": None,
            "error": "ref_id too short / missing — dropped",
            "duration_ms": 0,
            "replays": [],
            "created_at": started.isoformat(),
        })
        return None, None, None, "ref_id missing"

    prefix = ref_id[:3].upper()

    config = await db.routes.find_one({"prefix": prefix, "type": source_type, "active": True})

    if not config:
        await _log_callback({
            "id": log_id,
            "type": source_type,
            "channel": channel,
            "prefix": prefix,
            "ref_id": ref_id,
            "payload": payload,
            "raw_body": raw_body.decode("utf-8", errors="replace"),
            "headers": headers,
            "target_url": None,
            "status_code": None,
            "response_body": None,
            "error": f"No active route for prefix={prefix} type={source_type}",
            "duration_ms": 0,
            "replays": [],
            "created_at": started.isoformat(),
        })
        logger.warning(f"[{source_type}/{channel}] DROPPED prefix={prefix} ref={ref_id}")
        return None, None, None, "no route"

    # Resolve target URL
    if source_type == "digiflazz":
        target_url = config.get("forward_url_webhook")
    else:
        url_key = f"forward_url_{channel}"
        target_url = config.get(url_key)
        if not target_url:
            # Fallback to notify if specific channel not set
            target_url = config.get("forward_url_notify")

    if not target_url:
        await _log_callback({
            "id": log_id,
            "type": source_type,
            "channel": channel,
            "prefix": prefix,
            "ref_id": ref_id,
            "payload": payload,
            "raw_body": raw_body.decode("utf-8", errors="replace"),
            "headers": headers,
            "target_url": None,
            "status_code": None,
            "response_body": None,
            "error": f"Route prefix={prefix} has no target for channel={channel}",
            "duration_ms": 0,
            "replays": [],
            "created_at": started.isoformat(),
        })
        logger.warning(f"[{source_type}/{channel}] NO TARGET prefix={prefix}")
        return None, None, None, "no target url"

    # Forward
    status_code = None
    response_body = None
    error = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                target_url,
                content=raw_body,
                headers=headers,
                timeout=FORWARD_TIMEOUT,
            )
            status_code = resp.status_code
            response_body = resp.text[:2000]
            logger.info(f"[{source_type}/{channel}] {prefix} {ref_id} → {target_url} [{status_code}]")
    except Exception as e:
        error = str(e)
        logger.error(f"[{source_type}/{channel}] forward FAILED {prefix} → {target_url}: {e}")

    duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    await _log_callback({
        "id": log_id,
        "type": source_type,
        "channel": channel,
        "prefix": prefix,
        "ref_id": ref_id,
        "payload": payload,
        "raw_body": raw_body.decode("utf-8", errors="replace"),
        "headers": headers,
        "target_url": target_url,
        "status_code": status_code,
        "response_body": response_body,
        "error": error,
        "duration_ms": duration_ms,
        "replays": [],
        "created_at": started.isoformat(),
    })

    return status_code, response_body, target_url, error


# -------------------- Ayolinx endpoints --------------------
async def _ayolinx_handler(request: Request, channel: str):
    body = await request.body()
    headers = _safe_headers(request.headers)
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        payload = {}

    ref_id = _extract_ayolinx_ref(payload)
    await _forward(
        source_type="ayolinx",
        channel=channel,
        raw_body=body,
        headers=headers,
        payload=payload,
        ref_id=ref_id,
    )

    # Always reply with the expected Ayolinx success response so Ayolinx
    # doesn't retry forever (forwarding success is tracked in our logs).
    code, msg = AYOLINX_RESPONSES.get(channel, ("2005600", "Successful"))
    return {"responseCode": code, "responseMessage": msg}


@router.post("/payment/callback/qris")
async def cb_qris(request: Request):
    return await _ayolinx_handler(request, "qris")


@router.post("/payment/callback/va")
async def cb_va(request: Request):
    return await _ayolinx_handler(request, "va")


@router.post("/payment/callback/notify")
async def cb_notify(request: Request):
    return await _ayolinx_handler(request, "notify")


@router.post("/payment/callback/link")
async def cb_link(request: Request):
    return await _ayolinx_handler(request, "link")


# -------------------- DigiFlazz endpoint --------------------
@router.post("/biller/webhook")
async def cb_digiflazz(request: Request):
    body = await request.body()
    headers = _safe_headers(request.headers)
    try:
        payload = json.loads(body.decode("utf-8") or "{}")
    except Exception:
        payload = {}

    ref_id = _extract_digiflazz_ref(payload)
    await _forward(
        source_type="digiflazz",
        channel="webhook",
        raw_body=body,
        headers=headers,
        payload=payload,
        ref_id=ref_id,
    )
    # DigiFlazz expects HTTP 200 with any body; mirror common pattern
    return {"data": {"status": "received"}}


# -------------------- Health --------------------
@router.get("/health")
async def health():
    return {"status": "ok", "service": "marrakech-router"}
