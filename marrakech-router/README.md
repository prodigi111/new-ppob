# Marrakech Router

Standalone webhook routing service untuk Ayolinx + DigiFlazz, dengan admin panel & replay log.

## Apa fungsinya?

Menerima webhook dari Ayolinx / DigiFlazz di satu domain (`marrakech.cloud`), lalu **forward ke site tujuan** berdasarkan **prefix 3-huruf** di order ID:
- `RDS-xxx` → `raidstation.online`
- `NFG-xxx` → `neonforge.online`
- `BSS-xxx` → `blossombyte.online`
- dst.

Semua callback **di-log lengkap** (payload, headers, status forward, durasi) dan bisa di-**replay** dari admin panel.

## Struktur

```
marrakech-router/
├── backend/          FastAPI + MongoDB
│   ├── server.py
│   ├── db.py
│   ├── auth_utils.py
│   ├── routes/
│   │   ├── auth.py        # POST /api/auth/login
│   │   ├── admin.py       # CRUD routes + logs + replay
│   │   └── forwarder.py   # Public webhook receivers
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── index.html    Single-file React+Tailwind admin (CDN-only, no build)
└── deploy/
    ├── 01-setup-server.sh
    ├── 02-deploy-app.sh
    ├── 03-nginx-ssl.sh
    ├── nginx.conf.template
    ├── marrakech-router.service
    └── DEPLOY.md     ← baca ini untuk deploy
```

## Quick start lokal (development)

```bash
cd backend
cp .env.example .env
# edit MONGO_URL kalau perlu

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

Buka: http://127.0.0.1:8001/admin

Default login: `admin@voucherverse.com` / `admin123` (dari `.env`)

## Deploy production

Baca `deploy/DEPLOY.md`.
