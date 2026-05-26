#!/bin/bash
# =============================================================================
# switch-site.sh — Switch the active frontend preview to a specific site
#
#   /app/scripts/switch-site.sh <site_name>
#
# Updates the /app/frontend symlink to point to /app/sites/<name> and restarts
# the frontend supervisor process. Backend is unaffected.
# =============================================================================
set -e

NAME="$1"
if [ -z "$NAME" ]; then
  echo "Usage: $0 <site_name>"
  /app/scripts/list-sites.sh
  exit 1
fi

TARGET="/app/sites/$NAME"
if [ ! -d "$TARGET" ]; then
  echo "ERROR: Site directory not found: $TARGET"
  /app/scripts/list-sites.sh
  exit 1
fi

# node_modules safety net — make sure target has one (link to blaze if absent)
if [ ! -e "$TARGET/node_modules" ]; then
  echo "→ Linking node_modules from blaze..."
  ln -s /app/sites/blaze/node_modules "$TARGET/node_modules"
fi

# Update symlink atomically
TMPLINK="/app/frontend.tmp.$$"
ln -s "$TARGET" "$TMPLINK"
mv -Tf "$TMPLINK" /app/frontend

# Clear webpack cache so theme/CSS changes don't get stale from cache
rm -rf "$TARGET/node_modules/.cache" 2>/dev/null || true

echo "→ Restarting frontend supervisor..."
sudo supervisorctl restart frontend > /dev/null

sleep 3
echo ""
echo "✓ Active site is now: $NAME  ( /app/frontend → $TARGET )"
echo "  Open the preview URL to see the change."
