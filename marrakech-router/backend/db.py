"""MongoDB connection and admin seeding."""
import os
import bcrypt
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


async def ensure_indexes():
    await db.users.create_index("email", unique=True)
    await db.routes.create_index("prefix", unique=False)
    await db.routes.create_index([("prefix", 1), ("type", 1)], unique=True)
    await db.callback_logs.create_index("created_at")
    await db.callback_logs.create_index("prefix")
    await db.callback_logs.create_index("ref_id")


async def seed_admin():
    """Idempotent: ensure 1 admin user exists. Updates password if env changed."""
    email = os.environ.get('ADMIN_EMAIL', 'admin@voucherverse.com')
    password = os.environ.get('ADMIN_PASSWORD', 'admin123')
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    existing = await db.users.find_one({"email": email})
    if existing:
        # Update password to match env (idempotent re-deploy support)
        await db.users.update_one(
            {"email": email},
            {"$set": {"password": hashed, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    else:
        await db.users.insert_one({
            "id": "admin-001",
            "email": email,
            "password": hashed,
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


async def prune_old_logs(retention: int = 2000):
    """Keep only the most recent `retention` logs to prevent unbounded growth."""
    total = await db.callback_logs.count_documents({})
    if total <= retention:
        return 0
    to_delete = total - retention
    cursor = db.callback_logs.find({}, {"_id": 1}).sort("created_at", 1).limit(to_delete)
    ids = [doc["_id"] async for doc in cursor]
    if ids:
        result = await db.callback_logs.delete_many({"_id": {"$in": ids}})
        return result.deleted_count
    return 0
