# VoucherVerse / Multi-Site Top-Up Platform — PRD

## Original problem statement
Replikasi 5 website seperti Blaze Store dengan UI/tone berbeda tapi logic, backend, dan integrasi pihak ke-3 sama. Tambahan: integrasi Ayolinx + DigiFlazz di admin panel, switch frontend, hilangkan brand "Blaze", prefix 3-letter konfigurable untuk Order ID, deploy custom ke VPS, dan **routing webhook callback per-prefix**.

## Sites yang sudah di-clone (8 total)
blaze (master), neonforge (NFG), pixelvault (PXL), elitecharge (EOC), raidstation (RDS), quantumdrop (QDP), aquarift (AQR), blossombyte (BSS)

## Architecture
- **Main app** `/app/`: FastAPI + React + MongoDB multi-tenant. Deployed di Hostinger VPS (`72.62.250.69`).
- **Marrakech Router** `/app/marrakech-router/`: Standalone webhook routing service untuk deploy di `marrakech.cloud`. Menerima callback Ayolinx + DigiFlazz, forward ke site tujuan berdasarkan prefix 3-huruf.

## Sub-projects

### Marrakech Router (NEW — Feb 2026)
**Deploy target**: VPS Ubuntu di `marrakech.cloud`
**Stack**: FastAPI + MongoDB + single-HTML React (Tailwind CDN) admin panel
**Endpoints (publik untuk Ayolinx/DigiFlazz)**:
- `POST /api/payment/callback/qris` (Ayolinx)
- `POST /api/payment/callback/va` (Ayolinx)
- `POST /api/payment/callback/notify` (Ayolinx)
- `POST /api/payment/callback/link` (Ayolinx)
- `POST /api/biller/webhook` (DigiFlazz)

**Admin endpoints (JWT, 1 admin)**:
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/admin/routes`
- `GET /api/admin/logs` (filter prefix/type/status)
- `GET /api/admin/logs/{id}` (detail + payload mentah + headers)
- `POST /api/admin/logs/{id}/replay`
- `GET /api/admin/stats`

**DB collections**:
- `users` — admin (seed dari env, idempotent)
- `routes` — `{id, prefix, type:ayolinx|digiflazz, site_name, active, forward_url_{qris,va,notify,link,webhook}, notes}` (unique on prefix+type)
- `callback_logs` — `{id, type, channel, prefix, ref_id, payload, raw_body, headers, target_url, status_code, response_body, error, duration_ms, replays:[], created_at}`

**Fitur kunci**:
- Routing dinamis 100% via DB (no hardcoded). Prefix tak terdaftar → DROPPED & logged.
- Raw body & headers (X-SIGNATURE, X-TIMESTAMP, X-Hub-Signature) dipertahankan saat forward
- Webhook inspector: payload, headers, response target, replay history
- Tombol Replay untuk recovery saat destination sempat down
- Auto-prune log (default 2000 retention)
- Auth: PyJWT + bcrypt, same pattern as main app

**Deploy**: `marrakech-router/deploy/01-setup-server.sh`, `02-deploy-app.sh`, `03-nginx-ssl.sh` (Ubuntu + Nginx + systemd + certbot)

## Completed work (Feb 2026 session)
- ✅ 8 sites clone + theming + admin panel CRUD integrasi
- ✅ Ayolinx + DigiFlazz refresh_from_db sebelum transaksi
- ✅ Mascot & favicon removed, dynamic SVG logo+wordmark per site
- ✅ Custom VPS deploy script untuk Hostinger
- ✅ Fix `emergentintegrations` dependency saat external deploy
- ✅ **NEW**: Standalone Marrakech Router (`/app/marrakech-router/`) — webhook routing per-prefix dengan admin panel, logs, replay
- ✅ Provided proxy fix patch `/app/deploy/PROXY_FIX_PATCH.md` untuk legacy `blazestore.id` (alternatif sebelum migrasi ke marrakech)

## Backlog / Next
- **P0**: User deploy Marrakech Router ke `marrakech.cloud`, migrasi callback URL di dashboard Ayolinx/DigiFlazz dari proxy lama → marrakech, tambahkan route untuk semua 9 prefix (RDS, NFG, BSS, PXL, EOC, QDP, AQR, BLZ, VTX)
- **P1**: Verifikasi end-to-end transaksi real per site via marrakech (cek Logs tab)
- **P2**: Pensiunkan proxy lama `blazestore.id` setelah marrakech stabil 1-2 minggu
- **P2**: Tambahkan rate-limit / IP allowlist di Nginx untuk endpoint webhook (security)
- **P3**: Email alert ke admin bila log_failed_rate > threshold dalam 1 jam terakhir
