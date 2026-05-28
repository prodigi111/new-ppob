#!/usr/bin/env bash
# =============================================================================
# 01-setup-vps.sh — Setup VPS Ubuntu 24.04 LTS untuk VoucherVerse multi-site
# =============================================================================
# Jalankan SEKALI di VPS fresh. Script ini:
#   1. Update OS + install dependency (Node 20, Python 3.11, MongoDB 7, Nginx)
#   2. Setup firewall (allow SSH + HTTP + HTTPS)
#   3. Setup swap (2 GB) supaya 8 GB RAM tidak penuh saat build
#   4. Setup direktori target: /opt/voucherverse, /var/www/{site}
#   5. Setup MongoDB admin user
#
# Cara pakai:
#   wget https://raw.githubusercontent.com/USER/REPO/main/deploy/01-setup-vps.sh
#   chmod +x 01-setup-vps.sh
#   sudo ./01-setup-vps.sh
# =============================================================================
set -euo pipefail

# Warna log
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARN:${NC} $*"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
   err "Script ini harus dijalankan sebagai root (gunakan sudo)."
   exit 1
fi

log "=== STEP 1/8: Update OS ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

log "=== STEP 2/8: Install dependency dasar ==="
apt-get install -y \
  curl wget git rsync unzip \
  build-essential ca-certificates gnupg lsb-release \
  software-properties-common \
  ufw fail2ban \
  python3.12 python3.12-venv python3-pip \
  nginx certbot python3-certbot-nginx

log "=== STEP 3/8: Install Node.js 20 LTS + Yarn + PM2 ==="
if ! command -v node &> /dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
npm install -g yarn pm2
log "  Node: $(node -v)  | Yarn: $(yarn -v)  | PM2: $(pm2 -v)"

log "=== STEP 4/8: Install MongoDB 7.0 ==="
if ! command -v mongod &> /dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" \
    > /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt-get update -y
  apt-get install -y mongodb-org
fi
systemctl enable mongod
systemctl start mongod
sleep 3
log "  MongoDB: $(mongod --version | head -n 1)"

log "=== STEP 5/8: Setup firewall (ufw) ==="
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 'Nginx Full'   # 80 + 443
ufw --force enable
log "  Firewall rules:"
ufw status numbered

log "=== STEP 6/8: Setup swap 2 GB (kalau belum ada) ==="
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  log "  Swap 2GB aktif."
else
  log "  Swap sudah ada, skip."
fi

log "=== STEP 7/8: Buat direktori target ==="
mkdir -p /opt/voucherverse
mkdir -p /var/www
chown -R www-data:www-data /var/www

log "=== STEP 8/8: Setup fail2ban (proteksi SSH brute-force) ==="
systemctl enable fail2ban
systemctl start fail2ban

cat << EOF

${GREEN}=================================================================
✓ VPS SETUP SELESAI
=================================================================${NC}

Lanjutan:
  1. Setup MongoDB admin user → jalankan: ${YELLOW}bash 03-mongo-setup.sh${NC}
  2. Clone repo & deploy        → jalankan: ${YELLOW}bash 02-deploy-app.sh${NC}

IP publik VPS ini: $(curl -s --max-time 5 https://ifconfig.me || echo "(unable to detect)")
Inilah IP yang harus Anda whitelist di dashboard Ayolinx.

EOF
