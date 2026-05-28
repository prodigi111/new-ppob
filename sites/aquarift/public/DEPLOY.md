# 📘 Panduan Deployment VoucherVerse Multi-Site

Tutorial lengkap deploy 7 site (BlossomByte, EliteCharge, NeonForge, PixelVault, QuantumDrop, AquaRift, RaidStation) ke **1 VPS Hostinger Ubuntu 24.04** dengan single backend FastAPI + MongoDB.

**Target arsitektur:**
- 1 VPS, 1 backend FastAPI, 1 MongoDB
- 7 domain berbeda, 7 React static build di `/var/www/{site}/`
- Nginx routing per domain (same-origin `/api/*`)
- SSL Let's Encrypt auto-renew
- Customer data SHARED (1 akun untuk semua brand)
- Order ID prefix unik per site (BLM/ELC/NEO/PXV/QTM/AQR/RDS)

---

## 📋 Sebelum Mulai — Checklist

- [ ] VPS Hostinger aktif: **72.62.250.69** (Ubuntu 24.04, Malaysia)
- [ ] Akses root via SSH/password atau SSH key
- [ ] 7 domain sudah pointing ke IP VPS:
  - `blossombyte.online`
  - `elitecharge.online`
  - `neon-forge.online`
  - `pixel-vault.online`
  - `quantumdrop.online`
  - `aquarift.online`
  - `raidstation.online`
- [ ] Code sudah di-push ke GitHub (private repo OK, asal Anda punya akses)
- [ ] PEM key Ayolinx (private + public) di laptop, siap di-upload
- [ ] DigiFlazz credentials (username + prod_key) sudah ada

---

## STEP 1 — Setup DNS (sebelum apa pun)

Login ke panel domain (Hostinger atau registrar Anda). Untuk **SETIAP 7 domain**, tambah 2 A record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | `@` | `72.62.250.69` | 3600 |
| A | `www` | `72.62.250.69` | 3600 |

Tunggu propagasi **5-30 menit**. Cek dengan:
```bash
nslookup blossombyte.online
# Harus return 72.62.250.69
```

⚠️ **Penting:** SSL Let's Encrypt akan GAGAL kalau DNS belum propagasi. Pastikan semua 7 domain resolve ke IP VPS sebelum lanjut ke STEP 6.

---

## STEP 2 — SSH ke VPS

Dari laptop Anda (Mac/Linux Terminal atau Windows PowerShell):

```bash
ssh root@72.62.250.69
```

Masukkan password root yang Anda set saat order. Setelah masuk, Anda akan lihat prompt:
```
root@srv123456:~#
```

---

## STEP 3 — Setup VPS (install software)

Download & jalankan script setup:

```bash
# Download script setup dari repo (atau upload manual)
cd /root
wget https://raw.githubusercontent.com/USERNAME/REPO/main/deploy/01-setup-vps.sh
chmod +x 01-setup-vps.sh
./01-setup-vps.sh
```

**Atau kalau repo masih private:** Upload manual via SCP dari laptop:
```bash
# Dari LAPTOP (bukan VPS):
scp /app/deploy/01-setup-vps.sh root@72.62.250.69:/root/
scp /app/deploy/03-mongo-setup.sh root@72.62.250.69:/root/
# Lalu SSH ke VPS dan jalankan
```

Script akan install: Node 20, Python 3.12, MongoDB 7, Nginx, Certbot, Yarn, PM2, UFW firewall, dan swap 2 GB. Tunggu **±5-8 menit**.

Setelah selesai, akan muncul output:
```
✓ VPS SETUP SELESAI
IP publik VPS ini: 72.62.250.69
```

---

## STEP 4 — Setup MongoDB

```bash
cd /root
./03-mongo-setup.sh
```

Script ini akan:
1. Buat user `voucherverse` dengan password random 24 karakter
2. Aktifkan authentication di MongoDB
3. Restart `mongod`
4. **Simpan credentials di `/root/.mongo_credentials`**
5. Print `MONGO_URL` yang harus dimasukkan ke `.env` backend

📝 **CATAT atau screenshot** output `MONGO_URL` yang dihasilkan — Anda butuh untuk STEP 6.

---

## STEP 5 — Clone Repo & Upload PEM Keys

### 5.1 Clone repo (kalau GitHub publik)
```bash
cd /opt
git clone https://github.com/USERNAME/REPO.git voucherverse
cd voucherverse
```

### 5.2 Repo private — pakai Deploy Key
Di laptop, generate SSH key untuk VPS:
```bash
ssh root@72.62.250.69 'ssh-keygen -t ed25519 -N "" -f /root/.ssh/id_ed25519'
ssh root@72.62.250.69 'cat /root/.ssh/id_ed25519.pub'
# Copy output → GitHub repo → Settings → Deploy keys → Add deploy key
```

Lalu di VPS:
```bash
cd /opt
git clone git@github.com:USERNAME/REPO.git voucherverse
cd voucherverse
```

### 5.3 Upload PEM keys Ayolinx
Dari **laptop** (bukan VPS):
```bash
# Asumsi PEM key sudah Anda download dari preview ini
scp merchant_private_key.pem root@72.62.250.69:/opt/voucherverse/backend/
scp ayolinx_public_key.pem    root@72.62.250.69:/opt/voucherverse/backend/
```

---

## STEP 6 — Setup Backend .env

Di VPS:
```bash
cp /opt/voucherverse/deploy/.env.production.template /opt/voucherverse/backend/.env
nano /opt/voucherverse/backend/.env
```

Isi field berikut:

| Field | Nilai |
|---|---|
| `MONGO_URL` | Output dari STEP 4 (dari `/root/.mongo_credentials`) |
| `DB_NAME` | `voucherverse` |
| `JWT_SECRET` | Generate dengan: `openssl rand -hex 32` |
| `AYOLINX_*` | Sudah pre-filled di template ✓ |
| `DIGIFLAZZ_USERNAME` | Username Anda di DigiFlazz |
| `DIGIFLAZZ_PROD_KEY` | Production API key DigiFlazz |
| `DIGIFLAZZ_WEBHOOK_SECRET` | Webhook secret DigiFlazz |
| `ADMIN_EMAIL` | Email admin (mis. `admin@blossombyte.online`) |
| `ADMIN_PASSWORD` | Password kuat minimal 16 karakter |

Save dengan `Ctrl+O` → `Enter` → `Ctrl+X`.

---

## STEP 7 — Deploy Aplikasi

Pastikan semua DNS sudah propagasi (cek `nslookup` untuk semua 7 domain).

```bash
cd /opt/voucherverse
sudo bash deploy/02-deploy-app.sh
```

Script akan:
1. Pull repo terbaru
2. Install dependency backend Python
3. Build 7 site React (±5-10 menit)
4. Deploy static ke `/var/www/{site}/`
5. Setup systemd service backend
6. Generate config Nginx 7 server block
7. Tanya konfirmasi untuk SSL Let's Encrypt
8. Issue SSL untuk semua 7 domain

⚠️ **Saat ditanya "Lanjut issue SSL sekarang?":**
- Cek output yang menampilkan resolve setiap domain
- Kalau **SEMUA 7 domain** sudah resolve ke `72.62.250.69` → ketik `y`
- Kalau ada yang belum → ketik `n`, tunggu propagasi, lalu jalankan ulang script ini (idempoten)

Total durasi: ±15-20 menit.

---

## STEP 8 — Whitelist IP di Ayolinx

Setelah script selesai, IP outbound akan ditampilkan:
```
IP outbound (whitelist di Ayolinx): 72.62.250.69
```

Login ke dashboard Ayolinx → menu IP Whitelist → tambahkan IP ini.

⚠️ Tidak perlu whitelist di DigiFlazz (mereka tidak butuh IP whitelist secara default).

---

## STEP 9 — Verifikasi Go-Live

### 9.1 Buka semua domain di browser
- https://blossombyte.online (theme Sakura)
- https://elitecharge.online (theme Premium Gold)
- https://neon-forge.online (theme Cyberpunk)
- https://pixel-vault.online (theme Retro Arcade)
- https://quantumdrop.online (theme Futuristic)
- https://aquarift.online (theme Deep Sea)
- https://raidstation.online (theme Tactical)

Setiap domain harus tampil dengan logo + theme uniknya.

### 9.2 Login admin
- Buka SALAH SATU domain → `/login`
- Email: `ADMIN_EMAIL` yang Anda set di `.env`
- Password: `ADMIN_PASSWORD` yang Anda set di `.env`

### 9.3 Test Koneksi Ayolinx
- Buka `/admin` → tab **Integrasi**
- Klik **Test Koneksi** Ayolinx → harus muncul: ✅ `Ayolinx connection OK — access token diperoleh`

### 9.4 Test Order End-to-End
- Pilih produk apapun → checkout → pilih VA / QRIS Ayolinx
- Verify order_id diawali prefix sesuai domain:
  - Order dari `blossombyte.online` → diawali `BLM`
  - Order dari `neon-forge.online` → diawali `NEO`
  - dst.

---

## 🔧 Maintenance — Update Aplikasi

Setiap ada perubahan code di GitHub:
```bash
ssh root@72.62.250.69
cd /opt/voucherverse
sudo bash deploy/02-deploy-app.sh
```

Script otomatis: `git pull` → rebuild semua site → restart backend.
Total downtime: <10 detik (saat systemctl restart backend).

---

## 🔧 Troubleshooting

### Site tidak terbuka — DNS belum propagasi
```bash
dig +short blossombyte.online
# Harus return 72.62.250.69
```
Kalau kosong → tunggu propagasi (max 24 jam, biasanya <30 menit).

### Backend crash
```bash
journalctl -u voucherverse-backend -n 100 --no-pager
```

### SSL gagal
- Pastikan port 80 terbuka: `ufw status`
- Pastikan DNS propagasi sempurna sebelum certbot
- Coba manual: `certbot renew --dry-run`

### Build site gagal
```bash
cat /tmp/build-{site}.log
```

### MongoDB error
```bash
journalctl -u mongod -n 50 --no-pager
mongosh --username voucherverse --password 'PASS' --authenticationDatabase admin
```

### Cek resource VPS
```bash
htop                    # CPU + RAM realtime
df -h                   # disk usage
du -sh /var/www/*       # ukuran setiap site build
du -sh /opt/voucherverse/sites/blaze/node_modules  # node_modules (sekitar 600 MB)
```

---

## 📊 Architecture Recap

```
┌─────────────────────────────────────────────────────┐
│  VPS Hostinger 72.62.250.69 (Ubuntu 24.04)           │
│                                                       │
│  ┌──────────────────────────────────────────────┐  │
│  │  Nginx (port 80 → 443 SSL)                     │  │
│  │   ├── blossombyte.online → /var/www/blossombyte │  │
│  │   ├── elitecharge.online → /var/www/elitecharge │  │
│  │   ├── neon-forge.online  → /var/www/neonforge   │  │
│  │   ├── pixel-vault.online → /var/www/pixelvault  │  │
│  │   ├── quantumdrop.online → /var/www/quantumdrop │  │
│  │   ├── aquarift.online    → /var/www/aquarift    │  │
│  │   └── raidstation.online → /var/www/raidstation │  │
│  │                                                  │  │
│  │   /api/* (semua domain) → 127.0.0.1:8001       │  │
│  └──────────────────────────────────────────────┘  │
│                          ↓                            │
│  ┌──────────────────────────────────────────────┐  │
│  │  systemd: voucherverse-backend (port 8001)    │  │
│  │  FastAPI + uvicorn 2 worker                   │  │
│  │  Baca header X-Site-Id → prefix order ID      │  │
│  └──────────────────┬───────────────────────────┘  │
│                     ↓                                 │
│  ┌──────────────────────────────────────────────┐  │
│  │  MongoDB 7.0 (localhost:27017, auth enabled) │  │
│  │  Database: voucherverse                       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Shared resources (1×):** Backend, MongoDB, Nginx, SSL certs, IP whitelist Ayolinx
**Per-site (7×):** React build folder, Nginx server block, domain

---

## 💰 Biaya Bulanan

| Item | Cost |
|---|---|
| VPS Hostinger KVM 2 (8GB) | ~Rp 150k |
| 7 domain `.online` × Rp 50k/thn | ~Rp 30k/bln |
| SSL Let's Encrypt | FREE |
| **Total** | **±Rp 180k/bln** |

---

## 📚 Referensi File

| File | Lokasi | Fungsi |
|------|--------|--------|
| `01-setup-vps.sh` | `/app/deploy/` | Install software stack |
| `02-deploy-app.sh` | `/app/deploy/` | Build + deploy semua site |
| `03-mongo-setup.sh` | `/app/deploy/` | Setup MongoDB auth |
| `voucherverse-backend.service` | `/app/deploy/` | systemd unit backend |
| `.env.production.template` | `/app/deploy/` | Template env backend |

---

## ⏭️ Setelah Live

1. Setup monitoring (UptimeRobot atau Better Uptime — free)
2. Setup backup MongoDB harian:
   ```bash
   echo "0 2 * * * mongodump --uri='mongodb://USER:PASS@localhost:27017/?authSource=admin' --out=/backup/\$(date +\%Y\%m\%d)" | crontab -
   ```
3. Beri tahu Ayolinx & DigiFlazz tentang environment production yang sudah live
4. Coba transaksi nyata Rp 1.000 untuk validasi end-to-end
