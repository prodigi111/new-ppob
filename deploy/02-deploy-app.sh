#!/usr/bin/env bash
# =============================================================================
# 02-deploy-app.sh — Clone repo, build 7 site, setup backend + Nginx + SSL
# =============================================================================
# Jalankan SETELAH 01-setup-vps.sh selesai.
# Script ini idempoten: bisa dijalankan berulang untuk update deployment.
#
# Cara pakai (pertama kali):
#   sudo GIT_REPO="https://github.com/USERNAME/REPO.git" \
#        GIT_BRANCH="main" \
#        bash 02-deploy-app.sh
#
# Cara pakai (update setelah git push):
#   cd /opt/voucherverse && sudo bash deploy/02-deploy-app.sh
# =============================================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%H:%M:%S)]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date +%H:%M:%S)] WARN:${NC} $*"; }
err()  { echo -e "${RED}[$(date +%H:%M:%S)] ERROR:${NC} $*" >&2; }

# -----------------------------------------------------------------------------
# KONFIGURASI — ubah kalau perlu
# -----------------------------------------------------------------------------
APP_DIR="/opt/voucherverse"
GIT_REPO="${GIT_REPO:-}"   # set lewat env atau edit di sini
GIT_BRANCH="${GIT_BRANCH:-main}"

# Site folder → domain mapping (7 site)
declare -A SITE_DOMAINS=(
  [blossombyte]="blossombyte.online"
  [elitecharge]="elitecharge.online"
  [neonforge]="neon-forge.online"
  [pixelvault]="pixel-vault.online"
  [quantumdrop]="quantumdrop.online"
  [aquarift]="aquarift.online"
  [raidstation]="raidstation.online"
)

if [[ $EUID -ne 0 ]]; then
   err "Harus root (gunakan sudo)."
   exit 1
fi

# -----------------------------------------------------------------------------
# STEP 1 — Clone / pull repo
# -----------------------------------------------------------------------------
if [[ ! -d "$APP_DIR/.git" ]]; then
  if [[ -z "$GIT_REPO" ]]; then
    err "GIT_REPO belum di-set. Contoh:"
    err "  sudo GIT_REPO='https://github.com/USER/REPO.git' bash 02-deploy-app.sh"
    exit 1
  fi
  log "=== STEP 1: Clone repo $GIT_REPO (branch $GIT_BRANCH) ==="
  rm -rf "$APP_DIR"
  git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$APP_DIR"
else
  log "=== STEP 1: Pull update terbaru dari branch $GIT_BRANCH ==="
  cd "$APP_DIR"
  git fetch origin
  git reset --hard "origin/$GIT_BRANCH"
fi

# -----------------------------------------------------------------------------
# STEP 2 — Setup backend (.env + venv + deps)
# -----------------------------------------------------------------------------
log "=== STEP 2: Setup backend Python ==="
cd "$APP_DIR/backend"

if [[ ! -f .env ]]; then
  if [[ -f "$APP_DIR/deploy/.env.production.template" ]]; then
    cp "$APP_DIR/deploy/.env.production.template" .env
    warn "  .env baru dibuat dari template. ${YELLOW}EDIT MANUAL:${NC} nano $APP_DIR/backend/.env"
    warn "  Isi: MONGO_URL, JWT_SECRET, AYOLINX_*, DIGIFLAZZ_*"
    read -r -p "  Tekan ENTER setelah .env diisi untuk lanjut..." _
  else
    err "  Template .env.production.template tidak ditemukan."
    exit 1
  fi
fi

# Upload PEM keys reminder
for pem in merchant_private_key.pem ayolinx_public_key.pem; do
  if [[ ! -f "$APP_DIR/backend/$pem" ]]; then
    warn "  File $pem belum ada di $APP_DIR/backend/"
    warn "  Upload dulu via: scp $pem root@VPS_IP:$APP_DIR/backend/"
    read -r -p "  Tekan ENTER setelah file diupload..." _
  fi
done
chmod 600 "$APP_DIR/backend/"*.pem 2>/dev/null || true

# Install Python deps
if [[ ! -d venv ]]; then
  python3.12 -m venv venv || python3 -m venv venv
fi
source venv/bin/activate
pip install --upgrade pip wheel
pip install -r requirements.txt
deactivate

# -----------------------------------------------------------------------------
# STEP 3 — Build 7 site React → /var/www/{site}/
# -----------------------------------------------------------------------------
log "=== STEP 3: Build 7 React site ==="

# Install dependency di blaze (master) — site lain pakai symlink ke node_modules ini
cd "$APP_DIR/sites/blaze"
if [[ ! -d node_modules ]] || [[ ! -L node_modules ]]; then
  log "  Install yarn deps di blaze (master, ~3 menit pertama kali)..."
  yarn install --frozen-lockfile
fi

for site in "${!SITE_DOMAINS[@]}"; do
  domain="${SITE_DOMAINS[$site]}"
  log "  → Building $site ($domain)..."

  cd "$APP_DIR/sites/$site"

  # Symlink node_modules ke master kalau belum ada (hemat disk)
  if [[ ! -e node_modules ]]; then
    ln -s "$APP_DIR/sites/blaze/node_modules" node_modules
  fi

  # .env: pakai relative URL (same-origin, /api/* di domain yang sama)
  echo "REACT_APP_BACKEND_URL=" > .env

  yarn build > /tmp/build-$site.log 2>&1 || {
    err "  Build $site GAGAL. Cek log: cat /tmp/build-$site.log"
    tail -n 30 /tmp/build-$site.log
    exit 1
  }

  # Deploy static ke /var/www/$site
  mkdir -p "/var/www/$site"
  rsync -a --delete "build/" "/var/www/$site/"
  chown -R www-data:www-data "/var/www/$site"
  log "    ✓ $site → /var/www/$site"
done

# -----------------------------------------------------------------------------
# STEP 4 — Setup systemd service untuk backend
# -----------------------------------------------------------------------------
log "=== STEP 4: Setup systemd service backend ==="
cp "$APP_DIR/deploy/voucherverse-backend.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable voucherverse-backend
systemctl restart voucherverse-backend
sleep 3
if systemctl is-active --quiet voucherverse-backend; then
  log "  ✓ Backend berjalan di systemd"
else
  err "  Backend GAGAL start. Cek: journalctl -u voucherverse-backend -n 50"
  exit 1
fi

# -----------------------------------------------------------------------------
# STEP 5 — Generate config Nginx 7 server block
# -----------------------------------------------------------------------------
log "=== STEP 5: Generate config Nginx ==="
NGINX_CONF="/etc/nginx/sites-available/voucherverse"
> "$NGINX_CONF"

for site in "${!SITE_DOMAINS[@]}"; do
  domain="${SITE_DOMAINS[$site]}"
  cat >> "$NGINX_CONF" <<NGINX
# ====================== $site → $domain ======================
server {
    listen 80;
    listen [::]:80;
    server_name $domain www.$domain;

    # API proxy ke FastAPI backend
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
        client_max_body_size 25m;
    }

    # Static React build
    root /var/www/$site;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    # Cache aset hashed (Webpack/CRA pakai content-hash di filename)
    location ~* \\.(?:js|css|woff2?|ttf|otf|jpg|jpeg|png|gif|svg|webp|ico)\$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript
               application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1024;
}

NGINX
done

# Symlink ke sites-enabled
ln -sf /etc/nginx/sites-available/voucherverse /etc/nginx/sites-enabled/voucherverse
rm -f /etc/nginx/sites-enabled/default

# Test + reload
nginx -t
systemctl reload nginx
log "  ✓ Nginx aktif untuk ${#SITE_DOMAINS[@]} site"

# -----------------------------------------------------------------------------
# STEP 6 — Setup SSL Let's Encrypt
# -----------------------------------------------------------------------------
log "=== STEP 6: Cek SSL ==="
NEEDS_SSL=0
for site in "${!SITE_DOMAINS[@]}"; do
  domain="${SITE_DOMAINS[$site]}"
  if ! [ -d "/etc/letsencrypt/live/$domain" ]; then
    NEEDS_SSL=1
    break
  fi
done

if [[ $NEEDS_SSL -eq 1 ]]; then
  warn "  SSL belum di-issue untuk semua domain."
  warn "  Pastikan DNS sudah propagasi:"
  for site in "${!SITE_DOMAINS[@]}"; do
    domain="${SITE_DOMAINS[$site]}"
    resolved=$(dig +short "$domain" | head -1)
    if [[ -n "$resolved" ]]; then
      echo "    ✓ $domain → $resolved"
    else
      echo "    ✗ $domain → BELUM PROPAGASI"
    fi
  done
  read -r -p "  Lanjut issue SSL sekarang? [y/N] " yn
  if [[ "$yn" == "y" || "$yn" == "Y" ]]; then
    CERT_DOMAINS=()
    for site in "${!SITE_DOMAINS[@]}"; do
      domain="${SITE_DOMAINS[$site]}"
      CERT_DOMAINS+=("-d" "$domain" "-d" "www.$domain")
    done
    certbot --nginx --non-interactive --agree-tos \
      --email "admin@${SITE_DOMAINS[blossombyte]}" \
      "${CERT_DOMAINS[@]}" \
      --redirect
    log "  ✓ SSL aktif untuk semua domain"
  fi
else
  log "  ✓ SSL sudah ada untuk semua domain"
fi

# -----------------------------------------------------------------------------
# STEP 7 — Done!
# -----------------------------------------------------------------------------
cat << EOF

${GREEN}=================================================================
✓ DEPLOY SELESAI
=================================================================${NC}

Site yang live:
EOF
for site in "${!SITE_DOMAINS[@]}"; do
  domain="${SITE_DOMAINS[$site]}"
  echo "  • https://$domain  → $site"
done

cat << EOF

Service status:
  • Backend:  $(systemctl is-active voucherverse-backend)
  • Nginx:    $(systemctl is-active nginx)
  • MongoDB:  $(systemctl is-active mongod)

IP outbound (whitelist di Ayolinx): $(curl -s --max-time 5 https://ifconfig.me)

Untuk update di masa depan:
  cd $APP_DIR && sudo bash deploy/02-deploy-app.sh

Cek log backend:
  journalctl -u voucherverse-backend -f

EOF
