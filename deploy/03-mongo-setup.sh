#!/usr/bin/env bash
# =============================================================================
# 03-mongo-setup.sh — Setup MongoDB admin user + enable authentication
# =============================================================================
# Jalankan SETELAH 01-setup-vps.sh, SEBELUM 02-deploy-app.sh.
#
# Script ini:
#   1. Generate password kuat untuk MongoDB admin
#   2. Buat user "voucherverse" dengan akses ke database voucherverse
#   3. Enable authentication di /etc/mongod.conf
#   4. Restart mongod
#   5. Print MONGO_URL yang harus dimasukkan ke backend/.env
# =============================================================================
set -euo pipefail
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}Harus root.${NC}"; exit 1
fi

DB_NAME="voucherverse"
DB_USER="voucherverse"
DB_PASS=$(openssl rand -base64 32 | tr -d '/+=' | cut -c1-24)

if grep -q "authorization: enabled" /etc/mongod.conf 2>/dev/null; then
  echo -e "${YELLOW}MongoDB sudah punya authentication aktif.${NC}"
  echo "Kalau perlu reset user, edit /etc/mongod.conf, comment 'authorization: enabled', restart mongod, lalu jalankan ulang."
  exit 0
fi

echo -e "${GREEN}[1/3] Buat user MongoDB${NC}"
mongosh --quiet <<EOF
use admin
db.createUser({
  user: "$DB_USER",
  pwd: "$DB_PASS",
  roles: [
    { role: "readWrite", db: "$DB_NAME" },
    { role: "dbAdmin",   db: "$DB_NAME" }
  ]
})
EOF

echo -e "${GREEN}[2/3] Enable authentication di /etc/mongod.conf${NC}"
if grep -q "^security:" /etc/mongod.conf; then
  sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf
else
  echo -e "\nsecurity:\n  authorization: enabled" >> /etc/mongod.conf
fi

echo -e "${GREEN}[3/3] Restart MongoDB${NC}"
systemctl restart mongod
sleep 3

# Verify auth works
if mongosh --quiet --username "$DB_USER" --password "$DB_PASS" --authenticationDatabase admin \
   --eval "db.getName()" "$DB_NAME" &>/dev/null; then
  echo -e "${GREEN}✓ MongoDB authentication aktif & user bisa login${NC}"
else
  echo -e "${RED}✗ User dibuat tapi tidak bisa login. Cek log: journalctl -u mongod${NC}"
  exit 1
fi

# Save credentials securely
CRED_FILE="/root/.mongo_credentials"
cat > "$CRED_FILE" <<EOF
# Generated $(date)
MONGO_USER=$DB_USER
MONGO_PASS=$DB_PASS
MONGO_DB=$DB_NAME
MONGO_URL=mongodb://$DB_USER:$DB_PASS@localhost:27017/?authSource=admin
EOF
chmod 600 "$CRED_FILE"

cat << EOF

${GREEN}=================================================================
✓ MONGODB SIAP
=================================================================${NC}

Credentials disimpan di: ${YELLOW}$CRED_FILE${NC}

Masukkan baris berikut ke ${YELLOW}/opt/voucherverse/backend/.env${NC}:

  MONGO_URL=mongodb://$DB_USER:$DB_PASS@localhost:27017/?authSource=admin
  DB_NAME=$DB_NAME

EOF
