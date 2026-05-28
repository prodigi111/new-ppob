#!/bin/bash
# 02-deploy-app.sh — Deploy Marrakech Router application
# Run as: sudo bash 02-deploy-app.sh
# Expects: ./backend/, ./frontend/ in CWD (run from marrakech-router/deploy)

set -euo pipefail

APP_USER="${APP_USER:-marrakech}"
APP_DIR="/opt/marrakech-router"
VENV_DIR="${APP_DIR}/venv"
SERVICE_NAME="marrakech-router"
DOMAIN="${DOMAIN:-marrakech.cloud}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$(dirname "${SCRIPT_DIR}")"

echo "=== [1/8] Creating service user '${APP_USER}' ==="
id -u "${APP_USER}" &>/dev/null || useradd -r -s /bin/bash -d "${APP_DIR}" "${APP_USER}"

echo "=== [2/8] Copying app to ${APP_DIR} ==="
mkdir -p "${APP_DIR}"
rsync -a --delete --exclude 'venv' --exclude '__pycache__' --exclude '.env' \
  "${SRC_DIR}/backend/" "${APP_DIR}/backend/"
rsync -a --delete "${SRC_DIR}/frontend/" "${APP_DIR}/frontend/"

echo "=== [3/8] Creating .env if missing ==="
if [ ! -f "${APP_DIR}/backend/.env" ]; then
  cp "${SRC_DIR}/backend/.env.example" "${APP_DIR}/backend/.env"
  RAND_SECRET=$(openssl rand -hex 32)
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=${RAND_SECRET}|" "${APP_DIR}/backend/.env"
  sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://${DOMAIN}|" "${APP_DIR}/backend/.env"
  echo "Created ${APP_DIR}/backend/.env with random JWT_SECRET."
  echo "*** EDIT IT to change ADMIN_PASSWORD before exposing to public! ***"
else
  echo ".env already exists; leaving it untouched."
fi

echo "=== [4/8] Setting up Python venv ==="
python3 -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/pip" install --upgrade pip wheel
"${VENV_DIR}/bin/pip" install -r "${APP_DIR}/backend/requirements.txt"

echo "=== [5/8] Setting ownership ==="
chown -R "${APP_USER}":"${APP_USER}" "${APP_DIR}"

echo "=== [6/8] Installing systemd service ==="
cp "${SCRIPT_DIR}/marrakech-router.service" /etc/systemd/system/${SERVICE_NAME}.service
sed -i "s|__APP_USER__|${APP_USER}|g" /etc/systemd/system/${SERVICE_NAME}.service
sed -i "s|__APP_DIR__|${APP_DIR}|g" /etc/systemd/system/${SERVICE_NAME}.service

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl restart ${SERVICE_NAME}

sleep 3
echo "=== [7/8] Service status ==="
systemctl status ${SERVICE_NAME} --no-pager -l | head -20

echo "=== [8/8] Health check ==="
curl -fsS http://127.0.0.1:8001/api/health && echo "" || echo "WARN: backend not responding on 127.0.0.1:8001"

echo ""
echo "=== Done. Next: bash 03-nginx-ssl.sh (with DOMAIN=${DOMAIN}) ==="
