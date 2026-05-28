#!/bin/bash
# deploy-on-hostinger.sh — All-in-one deploy untuk VPS Hostinger yang SUDAH PUNYA voucherverse
# Skip install MongoDB/Nginx/Certbot (sudah terinstall sebelumnya)
#
# Usage:
#   sudo DOMAIN=marrakech.cloud EMAIL=you@example.com bash deploy-on-hostinger.sh

set -euo pipefail

DOMAIN="${DOMAIN:-marrakech.cloud}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
APP_USER="${APP_USER:-marrakech}"
APP_DIR="/opt/marrakech-router"
VENV_DIR="${APP_DIR}/venv"
SERVICE_NAME="marrakech-router"
APP_PORT="${APP_PORT:-8002}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(dirname "${SCRIPT_DIR}")"

echo ""
echo "================================================"
echo "  Marrakech Router Deploy (existing VPS mode)"
echo "  Domain : ${DOMAIN}"
echo "  Port   : ${APP_PORT}"
echo "  App dir: ${APP_DIR}"
echo "================================================"
echo ""

# ---------- 1. Pre-flight checks ----------
echo "=== [1/9] Pre-flight checks ==="
command -v mongod >/dev/null 2>&1 || { echo "ERROR: MongoDB belum terinstall. Install dulu atau jalankan 01-setup-server.sh"; exit 1; }
command -v nginx  >/dev/null 2>&1 || { echo "ERROR: Nginx belum terinstall."; exit 1; }
command -v certbot >/dev/null 2>&1 || { echo "ERROR: Certbot belum terinstall."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "ERROR: Python3 belum terinstall."; exit 1; }
systemctl is-active --quiet mongod || { echo "ERROR: MongoDB tidak running. Jalankan: systemctl start mongod"; exit 1; }

# Check port belum dipakai service lain
if ss -ltn | awk '{print $4}' | grep -q ":${APP_PORT}$"; then
  echo "ERROR: Port ${APP_PORT} sudah dipakai. Set APP_PORT=<other_port> dan ulangi."
  ss -ltnp | grep ":${APP_PORT}" || true
  exit 1
fi
echo "All checks passed."

# ---------- 2. Service user ----------
echo "=== [2/9] Service user '${APP_USER}' ==="
id -u "${APP_USER}" &>/dev/null || useradd -r -s /bin/bash -d "${APP_DIR}" "${APP_USER}"

# ---------- 3. Copy code ----------
echo "=== [3/9] Copy code to ${APP_DIR} ==="
mkdir -p "${APP_DIR}"
rsync -a --delete --exclude 'venv' --exclude '__pycache__' --exclude '.env' \
  "${SRC_DIR}/backend/" "${APP_DIR}/backend/"
rsync -a --delete "${SRC_DIR}/frontend/" "${APP_DIR}/frontend/"

# ---------- 4. .env ----------
echo "=== [4/9] Create .env (if missing) ==="
if [ ! -f "${APP_DIR}/backend/.env" ]; then
  cp "${SRC_DIR}/backend/.env.example" "${APP_DIR}/backend/.env"
  RAND_SECRET=$(openssl rand -hex 32)
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=${RAND_SECRET}|" "${APP_DIR}/backend/.env"
  sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN}|" "${APP_DIR}/backend/.env"
  echo "Created ${APP_DIR}/backend/.env"
  echo "  *** Default admin: admin@voucherverse.com / admin123 ***"
  echo "  *** Edit .env untuk ganti ADMIN_PASSWORD ***"
else
  echo ".env sudah ada, tidak diubah."
fi

# ---------- 5. Python venv ----------
echo "=== [5/9] Python venv + install deps ==="
python3 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --upgrade pip wheel --quiet
"${VENV_DIR}/bin/pip" install -r "${APP_DIR}/backend/requirements.txt" --quiet

# ---------- 6. Ownership ----------
echo "=== [6/9] Set ownership ==="
chown -R "${APP_USER}":"${APP_USER}" "${APP_DIR}"

# ---------- 7. systemd ----------
echo "=== [7/9] Install systemd service ==="
cp "${SCRIPT_DIR}/marrakech-router.service" /etc/systemd/system/${SERVICE_NAME}.service
sed -i "s|__APP_USER__|${APP_USER}|g" /etc/systemd/system/${SERVICE_NAME}.service
sed -i "s|__APP_DIR__|${APP_DIR}|g" /etc/systemd/system/${SERVICE_NAME}.service
sed -i "s|--port 8002|--port ${APP_PORT}|g" /etc/systemd/system/${SERVICE_NAME}.service

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}
sleep 3

if ! systemctl is-active --quiet ${SERVICE_NAME}; then
  echo "ERROR: Service gagal start. Log:"
  journalctl -u ${SERVICE_NAME} -n 30 --no-pager
  exit 1
fi

# Local health check
curl -fsS "http://127.0.0.1:${APP_PORT}/api/health" >/dev/null || {
  echo "ERROR: Backend tidak respond di http://127.0.0.1:${APP_PORT}/api/health"
  journalctl -u ${SERVICE_NAME} -n 20 --no-pager
  exit 1
}
echo "Backend up on 127.0.0.1:${APP_PORT}"

# ---------- 8. Nginx vhost ----------
echo "=== [8/9] Nginx vhost ${DOMAIN} ==="
cp "${SCRIPT_DIR}/nginx.conf.template" /etc/nginx/sites-available/marrakech-router
sed -i "s|__DOMAIN__|${DOMAIN}|g" /etc/nginx/sites-available/marrakech-router
sed -i "s|127.0.0.1:8002|127.0.0.1:${APP_PORT}|g" /etc/nginx/sites-available/marrakech-router

ln -sf /etc/nginx/sites-available/marrakech-router /etc/nginx/sites-enabled/marrakech-router

nginx -t
systemctl reload nginx
echo "Nginx vhost loaded (vhost lain tidak diubah)."

# ---------- 9. SSL via certbot ----------
echo "=== [9/9] Issue SSL cert for ${DOMAIN} ==="
if certbot certificates 2>/dev/null | grep -q "Domains:.*\b${DOMAIN}\b"; then
  echo "Cert untuk ${DOMAIN} sudah ada. Skip issue."
  systemctl reload nginx
else
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "${EMAIL}" --redirect
fi

echo ""
echo "================================================"
echo "  ✓ DEPLOY SELESAI"
echo "================================================"
echo "  Admin panel : https://${DOMAIN}/admin"
echo "  Health      : https://${DOMAIN}/api/health"
echo "  Service     : sudo systemctl status ${SERVICE_NAME}"
echo "  Log         : sudo journalctl -u ${SERVICE_NAME} -f"
echo ""
echo "  Default login (UBAH SEGERA via .env):"
echo "    Email    : admin@voucherverse.com"
echo "    Password : admin123"
echo ""
echo "  Webhook URLs (set di Ayolinx & DigiFlazz dashboard):"
echo "    https://${DOMAIN}/api/payment/callback/qris"
echo "    https://${DOMAIN}/api/payment/callback/va"
echo "    https://${DOMAIN}/api/payment/callback/notify"
echo "    https://${DOMAIN}/api/payment/callback/link"
echo "    https://${DOMAIN}/api/biller/webhook"
echo "================================================"
