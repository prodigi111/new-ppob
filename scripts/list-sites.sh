#!/bin/bash
# =============================================================================
# list-sites.sh — Show all available sites and the currently active one
# =============================================================================

ACTIVE=$(readlink /app/frontend 2>/dev/null | sed 's|.*/||')
echo ""
echo "Available sites at /app/sites/:"
echo "---------------------------------------------"
for dir in /app/sites/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  brand="?"
  if [ -f "$dir/src/theme.config.js" ]; then
    brand=$(grep -m1 -oE '"name":\s*"[^"]+"' "$dir/src/theme.config.js" | head -1 | sed 's/"name":\s*"//;s/"$//')
  fi
  marker="  "
  [ "$name" = "$ACTIVE" ] && marker="▶ "
  printf "%s%-20s  %s\n" "$marker" "$name" "$brand"
done
echo "---------------------------------------------"
echo "Active: $ACTIVE"
echo ""
echo "Available theme presets at /app/themes/:"
ls /app/themes/*.json 2>/dev/null | sed 's|.*/||;s|\.json$||' | sed 's/^/  - /'
echo ""
echo "Commands:"
echo "  clone:  /app/scripts/clone-site.sh <new_name> [preset]"
echo "  switch: /app/scripts/switch-site.sh <site_name>"
echo ""
