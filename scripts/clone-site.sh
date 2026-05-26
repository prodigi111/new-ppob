#!/bin/bash
# =============================================================================
# clone-site.sh — Replicate a site with a different theme
#
#   /app/scripts/clone-site.sh <new_site_name> [theme_preset]
#
# Examples:
#   /app/scripts/clone-site.sh neonforge neonforge
#   /app/scripts/clone-site.sh my-store-2 pixelvault
#
# - Sources from /app/sites/blaze (master template)
# - Applies theme JSON from /app/themes/<preset>.json
# - Shares node_modules with blaze via symlink (saves ~500MB per site)
# =============================================================================
set -e

NEW_NAME="$1"
PRESET="${2:-$1}"

if [ -z "$NEW_NAME" ]; then
  echo "Usage: $0 <new_site_name> [theme_preset]"
  echo ""
  echo "Available theme presets:"
  ls /app/themes/*.json 2>/dev/null | sed 's|.*/||;s|\.json$||' | sed 's/^/  - /'
  exit 1
fi

SOURCE="/app/sites/blaze"
DEST="/app/sites/$NEW_NAME"
THEME_JSON="/app/themes/${PRESET}.json"

if [ -e "$DEST" ]; then
  echo "ERROR: $DEST already exists. Pick a different name or remove it first."
  exit 1
fi
if [ ! -f "$THEME_JSON" ]; then
  echo "ERROR: Theme preset not found: $THEME_JSON"
  echo "Available presets:"
  ls /app/themes/*.json 2>/dev/null | sed 's|.*/||;s|\.json$||' | sed 's/^/  - /'
  exit 1
fi

echo "→ Cloning $SOURCE → $DEST  (preset: $PRESET)"
mkdir -p "$DEST"
# Copy everything EXCEPT heavy/regenerable dirs
rsync -a \
  --exclude='node_modules' \
  --exclude='build' \
  --exclude='.cache' \
  --exclude='.next' \
  "$SOURCE/" "$DEST/"

# Share node_modules with blaze (deps identical across sites)
ln -s "$SOURCE/node_modules" "$DEST/node_modules"

# Apply theme JSON
node /app/scripts/apply-theme.js "$DEST" "$THEME_JSON" "$NEW_NAME"

echo ""
echo "✓ Site '$NEW_NAME' ready at $DEST"
echo ""
echo "Next steps:"
echo "  • Preview:        /app/scripts/switch-site.sh $NEW_NAME"
echo "  • List all sites: /app/scripts/list-sites.sh"
echo "  • Restore Blaze:  /app/scripts/switch-site.sh blaze"
