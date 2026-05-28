"""Admin CRUD for routes + logs viewer + replay."""
import os
import uuid
import json
import httpx
from datetime import datetime, timezone
from typing import Optional, Literal, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from db import db
from auth_utils import require_admin

router = APIRouter(prefix="/admin", tags=["admin"])

FORWARD_TIMEOUT = float(os.environ.get('FORWARD_TIMEOUT_SECONDS', '15'))


# -------------------- Models --------------------
class RouteIn(BaseModel):
    prefix: str = Field(..., min_length=3, max_length=3)
    type: Literal["ayolinx", "digiflazz"]
    site_name: str = Field(..., min_length=1, max_length=64)
    active: bool = True
    # Ayolinx targets
    forward_url_qris: Optional[str] = None
    forward_url_va: Optional[str] = None
    forward_url_notify: Optional[str] = None
    forward_url_link: Optional[str] = None
    # DigiFlazz target
    forward_url_webhook: Optional[str] = None
    notes: Optional[str] = ""


class RouteUpdate(BaseModel):
    site_name: Optional[str] = None
    active: Optional[bool] = None
    forward_url_qris: Optional[str] = None
    forward_url_va: Optional[str] = None
    forward_url_notify: Optional[str] = None
    forward_url_link: Optional[str] = None
    forward_url_webhook: Optional[str] = None
    notes: Optional[str] = None


# -------------------- Routes CRUD --------------------
@router.get("/routes")
async def list_routes(_=Depends(require_admin)):
    items = await db.routes.find({}, {"_id": 0}).sort("prefix", 1).to_list(200)
    return {"items": items, "count": len(items)}


@router.post("/routes")
async def create_route(data: RouteIn, _=Depends(require_admin)):
    prefix = data.prefix.upper()
    # Enforce unique (prefix, type)
    existing = await db.routes.find_one({"prefix": prefix, "type": data.type})
    if existing:
        raise HTTPException(status_code=409, detail=f"Route prefix={prefix} type={data.type} sudah ada")

    doc = data.dict()
    doc["prefix"] = prefix
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    doc["updated_at"] = doc["created_at"]
    await db.routes.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/routes/{route_id}")
async def update_route(route_id: str, data: RouteUpdate, _=Depends(require_admin)):
    update = {k: v for k, v in data.dict().items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="Tidak ada field yang diupdate")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.routes.update_one({"id": route_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Route tidak ditemukan")
    doc = await db.routes.find_one({"id": route_id}, {"_id": 0})
    return doc


@router.delete("/routes/{route_id}")
async def delete_route(route_id: str, _=Depends(require_admin)):
    result = await db.routes.delete_one({"id": route_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Route tidak ditemukan")
    return {"deleted": True}


# -------------------- Logs --------------------
@router.get("/logs")
async def list_logs(
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    prefix: Optional[str] = None,
    type: Optional[str] = None,
    status: Optional[str] = Query(None, description="success | failed | dropped"),
    _=Depends(require_admin),
):
    q = {}
    if prefix:
        q["prefix"] = prefix.upper()
    if type:
        q["type"] = type
    if status == "success":
        q["status_code"] = {"$gte": 200, "$lt": 300}
    elif status == "failed":
        q["$or"] = [{"status_code": {"$gte": 400}}, {"status_code": None}, {"error": {"$ne": None}}]
    elif status == "dropped":
        q["status_code"] = None
        q["target_url"] = None

    total = await db.callback_logs.count_documents(q)
    items = await db.callback_logs.find(q, {"_id": 0, "raw_body": 0}) \
        .sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"items": items, "total": total, "limit": limit, "skip": skip}


@router.get("/logs/{log_id}")
async def get_log(log_id: str, _=Depends(require_admin)):
    log = await db.callback_logs.find_one({"id": log_id}, {"_id": 0})
    if not log:
        raise HTTPException(status_code=404, detail="Log tidak ditemukan")
    return log


@router.post("/logs/{log_id}/replay")
async def replay_log(log_id: str, _=Depends(require_admin)):
    log = await db.callback_logs.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Log tidak ditemukan")
    target_url = log.get("target_url")
    if not target_url:
        raise HTTPException(status_code=400, detail="Log ini tidak punya target_url (dropped)")

    raw_body = log.get("raw_body") or json.dumps(log.get("payload") or {})
    headers = log.get("headers") or {}
    # Strip hop-by-hop headers
    safe_headers = {k: v for k, v in headers.items() if k.lower() not in (
        "host", "content-length", "connection", "transfer-encoding", "accept-encoding"
    )}

    started = datetime.now(timezone.utc)
    status_code = None
    response_body = None
    error = None
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                target_url,
                content=raw_body.encode() if isinstance(raw_body, str) else raw_body,
                headers=safe_headers,
                timeout=FORWARD_TIMEOUT,
            )
            status_code = resp.status_code
            response_body = resp.text[:2000]
    except Exception as e:
        error = str(e)

    duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    entry = {
        "at": started.isoformat(),
        "target_url": target_url,
        "status_code": status_code,
        "response_body": response_body,
        "error": error,
        "duration_ms": duration_ms,
    }
    await db.callback_logs.update_one(
        {"id": log_id},
        {"$push": {"replays": entry}}
    )
    return entry


# -------------------- Stats --------------------
@router.get("/stats")
async def stats(_=Depends(require_admin)):
    routes_count = await db.routes.count_documents({})
    active_routes = await db.routes.count_documents({"active": True})
    logs_count = await db.callback_logs.count_documents({})
    success_count = await db.callback_logs.count_documents({"status_code": {"$gte": 200, "$lt": 300}})
    failed_count = await db.callback_logs.count_documents({"$or": [{"status_code": {"$gte": 400}}, {"error": {"$ne": None}}]})
    dropped_count = await db.callback_logs.count_documents({"target_url": None})

    # Per-prefix breakdown (last 24h)
    from datetime import timedelta
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    pipeline = [
        {"$match": {"created_at": {"$gte": since}}},
        {"$group": {
            "_id": {"prefix": "$prefix", "type": "$type"},
            "total": {"$sum": 1},
            "success": {"$sum": {"$cond": [{"$and": [{"$gte": ["$status_code", 200]}, {"$lt": ["$status_code", 300]}]}, 1, 0]}},
        }},
        {"$sort": {"total": -1}},
    ]
    by_prefix = []
    async for row in db.callback_logs.aggregate(pipeline):
        by_prefix.append({
            "prefix": row["_id"]["prefix"],
            "type": row["_id"]["type"],
            "total": row["total"],
            "success": row["success"],
        })

    return {
        "routes_total": routes_count,
        "routes_active": active_routes,
        "logs_total": logs_count,
        "logs_success": success_count,
        "logs_failed": failed_count,
        "logs_dropped": dropped_count,
        "last24h_by_prefix": by_prefix,
    }
