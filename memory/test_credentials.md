# Test Credentials

## Marrakech Router (`/app/marrakech-router/`)
- Admin email: `admin@voucherverse.com`
- Admin password: `admin123`
- Override via `backend/.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) — seed berjalan idempotent setiap startup, jadi mengubah `.env` lalu restart akan re-hash password.

## Main VoucherVerse app (`/app/`)
- Lihat existing admin di server.py — `admin_dict["password"] = hash_password("admin123")` (line ~1031)
