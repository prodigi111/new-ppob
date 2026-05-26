# Site Replication Scripts

This folder contains the **multi-site theming toolkit** for BlazeStore.
All 5+ sites share the same backend (`/app/backend`) and same React codebase,
but each has its own visual identity (brand name, colors, copy, assets).

## Folder layout

```
/app/sites/<site-name>/    ← per-site frontend (cloned from blaze)
/app/themes/<preset>.json  ← theme preset definitions
/app/scripts/*.sh          ← replication & switch tools
/app/frontend              ← symlink to the currently-active site
```

## Commands

### Clone a new site

```bash
/app/scripts/clone-site.sh <new_name> [preset]
```

Examples:
```bash
/app/scripts/clone-site.sh neonforge                 # uses preset of same name
/app/scripts/clone-site.sh my-new-store pixelvault   # custom name + preset
```

The script:
1. `rsync`s `/app/sites/blaze` to `/app/sites/<new_name>` (excludes `node_modules`)
2. Symlinks `node_modules` to Blaze's (saves ~500MB per site)
3. Runs `apply-theme.js` which regenerates:
   - `src/theme.config.js` (full brand metadata)
   - `src/index.css` (HSL `:root` variables)
   - `public/index.html` (title, meta, theme-color)
   - `package.json` (name field)

### Switch the active preview

```bash
/app/scripts/switch-site.sh <site_name>
```

Updates the `/app/frontend` symlink and restarts the supervisor. Backend untouched.

### List all sites & presets

```bash
/app/scripts/list-sites.sh
```

## Available presets

| Preset       | Vibe                          | Primary  |
|--------------|-------------------------------|----------|
| `blaze`      | Esports fierce, mainstream    | `#FF0000`|
| `neonforge`  | Cyberpunk neon, futuristic    | `#00F0FF`|
| `pixelvault` | Retro arcade 16-bit           | `#FF00AA`|
| `elitecharge`| Premium pro-gamer / luxury    | `#D4AF37`|
| `raidstation`| Hardcore FPS / military       | `#FF6B00`|

## Creating your own preset

Copy any file in `/app/themes/` to a new `.json` file and edit. Required fields:
`brand`, `meta`, `assets`, `copy`, `colors`, `fonts`, `style`. Then:

```bash
/app/scripts/clone-site.sh <name> <your_preset_id>
```

## Restoring Blaze

```bash
/app/scripts/switch-site.sh blaze
```

## Deployment (1 deploy = 1 site)

Before deploy, `switch-site.sh <name>` to point `/app/frontend` at the desired
site. The deploy build will pick up whatever `/app/frontend` resolves to.

## Why this design?

- **Backend untouched** — all sites hit the same `/api/*` endpoints.
- **Single source of truth per site** — `src/theme.config.js` drives Tailwind
  colors, brand strings, copy, and assets. Edit one file, theme cascades.
- **Cheap cloning** — `node_modules` shared via symlink. Each site is ~5–10MB
  on disk.
- **Reversible switches** — symlink swap is atomic, no copying.
