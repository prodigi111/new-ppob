"""
Marrakech Router — standalone webhook routing service.

Receives Ayolinx & DigiFlazz webhooks on `marrakech.cloud`, looks up the
3-letter prefix from `originalPartnerReferenceNo` / `data.ref_id`, and forwards
the raw body to the destination site (RDS, NFG, BSS, ...).

All forwards are logged for inspection & replay through the admin panel.
"""
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load .env BEFORE importing modules that read env at import time
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from db import ensure_indexes, seed_admin
from routes.auth import router as auth_router
from routes.admin import router as admin_router
from routes.forwarder import router as forwarder_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("marrakech")

app = FastAPI(title="Marrakech Router", version="1.0.0")

# CORS
origins = [o.strip() for o in os.environ.get('CORS_ORIGINS', '*').split(',') if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# All API routes under /api
app.include_router(auth_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(forwarder_router, prefix="/api")


@app.on_event("startup")
async def startup():
    await ensure_indexes()
    await seed_admin()
    logger.info("Marrakech Router started. Admin: %s", os.environ.get('ADMIN_EMAIL'))


@app.get("/api")
async def api_root():
    return {
        "service": "marrakech-router",
        "version": "1.0.0",
        "endpoints": {
            "webhooks": [
                "POST /api/payment/callback/qris",
                "POST /api/payment/callback/va",
                "POST /api/payment/callback/notify",
                "POST /api/payment/callback/link",
                "POST /api/biller/webhook",
            ],
            "admin": "POST /api/auth/login → /api/admin/*",
        },
    }


# Serve frontend admin panel (single-file React+Tailwind via CDN)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
if FRONTEND_DIR.exists():
    @app.get("/")
    async def root():
        return FileResponse(FRONTEND_DIR / "index.html")

    @app.get("/admin")
    @app.get("/admin/{path:path}")
    async def admin_spa(path: str = ""):
        return FileResponse(FRONTEND_DIR / "index.html")

    # static assets (if any added later)
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8001, reload=False)
