# Marrakech Router — Deployment Guide

Webhook routing service untuk forward Ayolinx & DigiFlazz callbacks ke multi-site berdasarkan prefix 3-huruf.

**Target deployment**: Ubuntu 22.04/24.04 VPS, domain `marrakech.cloud`.

---

## TL;DR (3 langkah)

```bash
# 1. Upload folder marrakech-router/ ke VPS (mis. /root/marrakech-router)
scp -r marrakech-router root@<VPS_IP>:/root/

# 2. SSH ke VPS
ssh root@<VPS_IP>
cd /root/marrakech-router/deploy

# 3. Run scripts berurutan
sudo bash 01-setup-server.sh
sudo bash 02-deploy-app.sh
sudo DOMAIN=marrakech.cloud EMAIL=you@example.com bash 03-nginx-ssl.sh
```

Selesai! Buka `https://marrakech.cloud/admin` → login dengan kredensial dari `.env`.

---

## Prerequisites

1. **DNS**: Arahkan A record `marrakech.cloud` → IP VPS Anda **sebelum** menjalankan `03-nginx-ssl.sh` (Certbot perlu DNS valid untuk issue cert).
2. **Akses root** ke VPS Ubuntu.
3. **Port 80 & 443** terbuka.

---

## Detail langkah

### Langkah 1 — Setup server (sekali saja)

```bash
sudo bash 01-setup-server.sh
```

Yang dilakukan:
- Update system
- Install Python 3.11, MongoDB 7, Nginx, Certbot, UFW
- Enable firewall (allow SSH + HTTP/HTTPS)

### Langkah 2 — Deploy aplikasi

```bash
sudo bash 02-deploy-app.sh
```

Yang dilakukan:
- Buat user `marrakech` (service user)
- Copy code ke `/opt/marrakech-router/`
- Buat `.env` dengan JWT_SECRET random (jika belum ada)
- Setup Python venv + install requirements
- Install + start systemd service `marrakech-router`

**PENTING**: Edit `/opt/marrakech-router/backend/.env` setelah ini:
```bash
sudo nano /opt/marrakech-router/backend/.env
```
- Ganti `ADMIN_PASSWORD` ke password yang kuat
- Set `CORS_ORIGINS` ke domain Anda

Restart setelah edit:
```bash
sudo systemctl restart marrakech-router
```

### Langkah 3 — Nginx + SSL

```bash
sudo DOMAIN=marrakech.cloud EMAIL=you@example.com bash 03-nginx-ssl.sh
```

Yang dilakukan:
- Setup Nginx reverse proxy (port 80/443 → 127.0.0.1:8001)
- Request Let's Encrypt SSL cert via Certbot
- Enable auto-renewal cert
- Force HTTPS redirect

---

## URL Akses

| Endpoint | URL |
|---|---|
| Admin panel | `https://marrakech.cloud/admin` |
| Login | `POST https://marrakech.cloud/api/auth/login` |
| Health check | `GET  https://marrakech.cloud/api/health` |
| Ayolinx QRIS callback | `POST https://marrakech.cloud/api/payment/callback/qris` |
| Ayolinx VA callback | `POST https://marrakech.cloud/api/payment/callback/va` |
| Ayolinx Notify | `POST https://marrakech.cloud/api/payment/callback/notify` |
| Ayolinx Link | `POST https://marrakech.cloud/api/payment/callback/link` |
| DigiFlazz webhook | `POST https://marrakech.cloud/api/biller/webhook` |

---

## Set di Dashboard Ayolinx & DigiFlazz

Setelah deploy berhasil, **update callback URL** di dashboard provider:

**Ayolinx Merchant Dashboard:**
- Payment Notify URL: `https://marrakech.cloud/api/payment/callback/notify`
- QRIS Notify URL: `https://marrakech.cloud/api/payment/callback/qris`
- VA Notify URL: `https://marrakech.cloud/api/payment/callback/va`

**DigiFlazz Reseller Dashboard:**
- Webhook URL: `https://marrakech.cloud/api/biller/webhook`

---

## Konfigurasi Routes via Admin Panel

1. Buka `https://marrakech.cloud/admin`
2. Login dengan `ADMIN_EMAIL` + `ADMIN_PASSWORD` dari `.env`
3. Tab **Routes** → klik **+ Tambah Route**
4. Isi untuk setiap site:

| Prefix | Tipe | Site Name | Forward URL |
|---|---|---|---|
| `BLZ` | ayolinx | BlazeStore | `https://blazestore.id/api/payment/callback/*` |
| `RDS` | ayolinx | RaidStation | `https://raidstation.online/api/payment/callback/*` |
| `NFG` | ayolinx | NeonForge | `https://neonforge.online/api/payment/callback/*` |
| `PXL` | ayolinx | PixelVault | `https://pixelvault.online/api/payment/callback/*` |
| `EOC` | ayolinx | EliteCharge | `https://elitecharge.online/api/payment/callback/*` |
| `QDP` | ayolinx | QuantumDrop | `https://quantumdrop.online/api/payment/callback/*` |
| `AQR` | ayolinx | AquaRift | `https://aquarift.online/api/payment/callback/*` |
| `BSS` | ayolinx | BlossomByte | `https://blossombyte.online/api/payment/callback/*` |
| `VTX` | ayolinx | Vortex (legacy) | `https://vortexgamers.cloud/api/payment/callback/*` |

Buat juga **DigiFlazz** route per prefix → `https://<site>/api/biller/webhook`.

---

## Logs & Replay

Tab **Logs** menampilkan semua callback yang masuk + status forward (HTTP 2xx/4xx/5xx atau dropped).

- Klik baris untuk lihat **payload mentah, headers, response target, dan history replay**.
- Tombol **Replay** mengirim ulang payload yang sama ke target URL (berguna saat destination sempat down).
- Filter by prefix / type / status untuk troubleshooting cepat.
- Toggle **Auto refresh (5s)** untuk monitor real-time.

---

## Maintenance

| Task | Command |
|---|---|
| Cek status | `sudo systemctl status marrakech-router` |
| Lihat log real-time | `sudo journalctl -u marrakech-router -f` |
| Restart | `sudo systemctl restart marrakech-router` |
| Cek nginx access log | `sudo tail -f /var/log/nginx/marrakech-router.access.log` |
| Renew SSL (auto) | Sudah di-handle Certbot via systemd timer |
| Update code | `cd /opt/marrakech-router && git pull` lalu `sudo systemctl restart marrakech-router` |
| Backup DB | `mongodump --db marrakech_router --out /backup/$(date +%F)` |

---

## Troubleshooting

**Backend tidak start:**
```bash
sudo journalctl -u marrakech-router -n 50 --no-pager
```

**SSL gagal di certbot:**
- Pastikan DNS A record sudah propagate (`dig marrakech.cloud`)
- Pastikan port 80 terbuka (`sudo ufw status`)

**Webhook tidak diterima destination:**
1. Cek Logs tab — apakah callback masuk?
2. Cek Status: jika `DROP` → route belum ada / tidak active. Tambah/aktifkan route.
3. Jika `HTTP 4xx/5xx` → klik detail, lihat response_body dari destination.
4. Klik **Replay** untuk uji ulang setelah destination diperbaiki.

**Forward gagal terus dengan SSL error:**
- Pastikan destination URL pakai HTTPS yang valid (atau set `verify=False` di httpx — TIDAK direkomendasikan).
