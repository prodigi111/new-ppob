#!/bin/bash
# 03-nginx-ssl.sh — Configure Nginx reverse proxy + Let's Encrypt SSL
# Run as: sudo DOMAIN=marrakech.cloud EMAIL=you@example.com bash 03-nginx-ssl.sh

set -euo pipefail

DOMAIN="${DOMAIN:-marrakech.cloud}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Configuring Nginx for ${DOMAIN} ==="

# Render template
cp "${SCRIPT_DIR}/nginx.conf.template" /etc/nginx/sites-available/marrakech-router
sed -i "s|__DOMAIN__|${DOMAIN}|g" /etc/nginx/sites-available/marrakech-router

ln -sf /etc/nginx/sites-available/marrakech-router /etc/nginx/sites-enabled/marrakech-router

nginx -t
systemctl reload nginx

# DO NOT remove sites-enabled/default — leave existing voucherverse vhosts intact

echo "=== Requesting Let's Encrypt SSL for ${DOMAIN} ==="
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email "${EMAIL}" --redirect

echo ""
echo "=== Done. Test: https://${DOMAIN}/api/health ==="
echo "Admin panel: https://${DOMAIN}/admin"
