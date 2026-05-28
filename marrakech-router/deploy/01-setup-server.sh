#!/bin/bash
# 01-setup-server.sh — Initial server setup for Marrakech Router
# Target: fresh Ubuntu 22.04 / 24.04 VPS
# Run as: sudo bash 01-setup-server.sh

set -euo pipefail

echo "=== [1/6] Updating system ==="
apt update && apt upgrade -y

echo "=== [2/6] Installing core packages ==="
apt install -y curl wget git ufw build-essential software-properties-common ca-certificates gnupg

echo "=== [3/6] Installing Python 3.11 + pip ==="
apt install -y python3 python3-venv python3-pip

echo "=== [4/6] Installing MongoDB 7 ==="
if ! command -v mongod &> /dev/null; then
  curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
  UBUNTU_CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")
  if [ "$UBUNTU_CODENAME" = "noble" ]; then UBUNTU_CODENAME="jammy"; fi
  echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${UBUNTU_CODENAME}/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
  apt update
  apt install -y mongodb-org
  systemctl enable mongod
  systemctl start mongod
  echo "MongoDB installed and started."
else
  echo "MongoDB already installed."
fi

echo "=== [5/6] Installing Nginx + Certbot ==="
apt install -y nginx certbot python3-certbot-nginx

echo "=== [6/6] Configuring firewall ==="
ufw allow OpenSSH || true
ufw allow 'Nginx Full' || true
ufw --force enable

echo ""
echo "=== Done. Next: bash 02-deploy-app.sh ==="
