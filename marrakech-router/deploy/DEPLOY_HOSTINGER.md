# 🚀 Deploy Marrakech Router ke VPS Hostinger (yang sudah ada VoucherVerse)

Panduan **khusus** untuk deploy ke VPS `72.62.250.69` yang sudah punya voucherverse-backend, MongoDB, Nginx, dan Certbot. Tidak akan menyentuh service lama.

## Setup yang akan dibuat

| Item | Nilai |
|---|---|
| Domain | `marrakech.cloud` (DNS sudah ✅) |
| Backend port internal | `127.0.0.1:8002` (voucherverse pakai 8001 — aman) |
| App dir | `/opt/marrakech-router` |
| Service user | `marrakech` |
| Systemd unit | `marrakech-router.service` |
| Nginx vhost | `/etc/nginx/sites-available/marrakech-router` (vhost voucherverse TIDAK diubah) |
| MongoDB DB | `marrakech_router` (terpisah dari `voucherverse`) |
| SSL | Let's Encrypt via Certbot (auto-renew) |

---

## Langkah 1 — Upload code ke VPS

**Dari lokal (laptop Anda):**

```bash
# Compress folder marrakech-router
cd /app
tar czf marrakech-router.tar.gz marrakech-router

# Upload ke VPS
scp marrakech-router.tar.gz root@72.62.250.69:/root/

# Atau via rsync (lebih bagus untuk update di kemudian hari)
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '.env' \
  /app/marrakech-router root@72.62.250.69:/root/
```

**SSH ke VPS lalu extract:**

```bash
ssh root@72.62.250.69
cd /root
tar xzf marrakech-router.tar.gz   # (skip jika pakai rsync)
ls /root/marrakech-router/        # Verifikasi: backend/ frontend/ deploy/ README.md
```

---

## Langkah 2 — Verifikasi DNS

```bash
dig +short marrakech.cloud
# Harus return: 72.62.250.69
```

Jika belum, tunggu propagasi (biasanya 5-30 menit). Jangan lanjut sebelum DNS pointing ke IP yang benar — Certbot akan gagal.

---

## Langkah 3 — Verifikasi port 8002 bebas

```bash
ss -ltnp | grep ':8002 ' || echo "Port 8002 bebas ✓"
```

Jika port 8002 ternyata sudah dipakai service lain, set port lain saat deploy (mis. `APP_PORT=8003`).

---

## Langkah 4 — Deploy (1 command)

```bash
cd /root/marrakech-router/deploy
sudo DOMAIN=marrakech.cloud EMAIL=youremail@example.com bash deploy-on-hostinger.sh
```

Atau bila ingin override port:
```bash
sudo APP_PORT=8003 DOMAIN=marrakech.cloud EMAIL=you@example.com bash deploy-on-hostinger.sh
```

Script ini akan:
1. ✅ Cek MongoDB/Nginx/Certbot terinstall & running
2. ✅ Cek port 8002 belum dipakai service lain
3. ✅ Buat user `marrakech`, copy code ke `/opt/marrakech-router`
4. ✅ Buat `.env` dengan `JWT_SECRET` random
5. ✅ Setup Python venv + install requirements
6. ✅ Install & start systemd service
7. ✅ Health check local (`http://127.0.0.1:8002/api/health`)
8. ✅ Tambah nginx vhost untuk `marrakech.cloud` (vhost voucherverse TIDAK diutak-atik)
9. ✅ Issue SSL cert via Certbot

Total waktu: ~2-3 menit.

---

## Langkah 5 — Verifikasi

```bash
# Health check publik
curl https://marrakech.cloud/api/health
# Expected: {"status":"ok","service":"marrakech-router"}

# Cek service
sudo systemctl status marrakech-router

# Cek log
sudo journalctl -u marrakech-router -n 50 --no-pager

# Cek nginx vhost
sudo nginx -t
sudo ls -la /etc/nginx/sites-enabled/
```

---

## Langkah 6 — Login & Tambah Routes

Buka browser: **https://marrakech.cloud/admin**

Default login:
- Email: `admin@voucherverse.com`
- Password: `admin123`

> ⚠️ **PENTING**: Setelah login pertama, segera ubah password via:
> ```bash
> sudo nano /opt/marrakech-router/backend/.env
> # Ubah ADMIN_PASSWORD=admin123 → password kuat Anda
> sudo systemctl restart marrakech-router
> ```

Lalu di **Tab Routes**, klik **+ Tambah Route** untuk setiap prefix:

### Routes Ayolinx (Payment)

| Prefix | Site Name | QRIS URL | VA URL | Notify URL | Link URL |
|---|---|---|---|---|---|
| `BLZ` | BlazeStore | `https://blazestore.id/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `RDS` | RaidStation | `https://raidstation.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `NFG` | NeonForge | `https://neonforge.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `PXL` | PixelVault | `https://pixelvault.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `EOC` | EliteCharge | `https://elitecharge.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `QDP` | QuantumDrop | `https://quantumdrop.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `AQR` | AquaRift | `https://aquarift.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `BSS` | BlossomByte | `https://blossombyte.online/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |
| `VTX` | Vortex (legacy) | `https://vortexgamers.cloud/api/payment/callback/qris` | `…/va` | `…/notify` | `…/link` |

### Routes DigiFlazz (Topup webhook)

| Prefix | Site Name | Webhook URL |
|---|---|---|
| `BLZ` | BlazeStore | `https://blazestore.id/api/biller/webhook` |
| `RDS` | RaidStation | `https://raidstation.online/api/biller/webhook` |
| `NFG` | NeonForge | `https://neonforge.online/api/biller/webhook` |
| `PXL` | PixelVault | `https://pixelvault.online/api/biller/webhook` |
| `EOC` | EliteCharge | `https://elitecharge.online/api/biller/webhook` |
| `QDP` | QuantumDrop | `https://quantumdrop.online/api/biller/webhook` |
| `AQR` | AquaRift | `https://aquarift.online/api/biller/webhook` |
| `BSS` | BlossomByte | `https://blossombyte.online/api/biller/webhook` |
| `VTX` | Vortex (legacy) | `https://vortexgamers.cloud/api/biller/webhook` |

---

## Langkah 7 — Update callback URL di Provider

### Di Dashboard Ayolinx
Buka pengaturan callback / webhook, ubah ke:
- **Notify URL**: `https://marrakech.cloud/api/payment/callback/notify`
- **QRIS Notify URL**: `https://marrakech.cloud/api/payment/callback/qris`
- **VA Notify URL**: `https://marrakech.cloud/api/payment/callback/va`
- **Payment Link Callback**: `https://marrakech.cloud/api/payment/callback/link`

### Di Dashboard DigiFlazz
- **Report URL** (webhook): `https://marrakech.cloud/api/biller/webhook`

---

## Langkah 8 — Test End-to-End

1. Buat 1 transaksi nyata di salah satu site (mis. raidstation.online beli pulsa kecil)
2. Bayar via QRIS atau VA
3. Di admin panel marrakech (`Tab Logs`), klik **Auto refresh (5s)** ON
4. Saat callback dari Ayolinx masuk, akan muncul row baru:
   - **Prefix**: `RDS`
   - **Status**: HTTP 200 (hijau) bila forward sukses
   - Klik row → lihat payload mentah + response dari raidstation.online
5. Setelah top-up DigiFlazz selesai, callback DigiFlazz juga masuk → status `Sukses`/`Gagal` ter-record

Bila status muncul **DROP** atau **HTTP 4xx/5xx**:
- DROP → route belum ditambahkan / belum active untuk prefix itu
- 4xx/5xx → klik detail, lihat response_body untuk error dari destination
- Klik tombol **Replay** setelah fix untuk kirim ulang tanpa perlu transaksi baru

---

## Troubleshooting

### Service tidak start
```bash
sudo journalctl -u marrakech-router -n 50 --no-pager
```
Cek error — biasanya: MongoDB tidak running, port konflik, atau env var hilang.

### Nginx error
```bash
sudo nginx -t
sudo tail -50 /var/log/nginx/error.log
```

### SSL gagal di certbot
- Pastikan DNS sudah point: `dig +short marrakech.cloud`
- Port 80 harus terbuka: `sudo ufw status`
- Tidak ada nginx error lain yang blocking
- Manual retry: `sudo certbot --nginx -d marrakech.cloud`

### Voucherverse jadi error setelah install?
**Tidak akan terjadi** karena script:
- Pakai port 8002 (voucherverse di 8001)
- Pakai user `marrakech` (tidak overwrite voucherverse user)
- Hanya **menambah** nginx vhost, tidak menghapus/edit yang sudah ada
- DB `marrakech_router` terpisah

Bila ragu, cek:
```bash
sudo systemctl status voucherverse-backend
curl https://raidstation.online/api/payment/callback/qris -X POST -H "Content-Type: application/json" -d '{}'
# Harus tetap return 200 dengan response Ayolinx
```

---

## Update code di kemudian hari

Dari lokal:
```bash
rsync -avz --exclude 'venv' --exclude '__pycache__' --exclude '.env' \
  /app/marrakech-router/ root@72.62.250.69:/opt/marrakech-router/
```

Di VPS:
```bash
ssh root@72.62.250.69
sudo chown -R marrakech:marrakech /opt/marrakech-router
sudo -u marrakech /opt/marrakech-router/venv/bin/pip install -r /opt/marrakech-router/backend/requirements.txt
sudo systemctl restart marrakech-router
sudo systemctl status marrakech-router
```

---

## Rollback (kalau perlu disable)

```bash
sudo systemctl stop marrakech-router
sudo systemctl disable marrakech-router
sudo rm /etc/nginx/sites-enabled/marrakech-router
sudo systemctl reload nginx
# Code & DB tetap ada di /opt/marrakech-router dan mongodb — bisa diaktifkan ulang
```

Untuk hapus total:
```bash
sudo systemctl stop marrakech-router
sudo systemctl disable marrakech-router
sudo rm /etc/systemd/system/marrakech-router.service
sudo rm /etc/nginx/sites-enabled/marrakech-router /etc/nginx/sites-available/marrakech-router
sudo systemctl reload nginx
sudo rm -rf /opt/marrakech-router
sudo userdel -r marrakech
mongosh marrakech_router --eval "db.dropDatabase()"
sudo certbot delete --cert-name marrakech.cloud
```
