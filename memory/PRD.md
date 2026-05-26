# BlazeStore - Digital Voucher Marketplace

## Original Problem Statement
Build a digital voucher marketplace website similar to Uniplay (https://uniplay.id/) with:
- Product catalog for game vouchers
- Top-up with game ID input
- Transaction history & order tracking
- Admin dashboard
- Reseller feature with independent domain support
- JWT authentication
- Dark mode with Blaze brand theme
- Ayolinx payment gateway integration
- DigiFlazz biller integration

## Brand Identity - Blaze Theme
- **Blaze Red**: #FF0000 (Primary)
- **Electric White**: #FFFFFF (Secondary)
- **Golden Coin**: #FFD700 (Accent)
- **Deep Midnight**: #050A18 (Background)
- **Circuit Grey**: #2D3436 (Muted)
- **Logo**: Custom Blaze logo with flame icon
- **Mascot**: Flame character with gaming controller

## User Personas
1. **Gamers** - End users who want to top up game currencies
2. **Resellers** - Business users who sell vouchers and want special pricing
3. **Admin** - Platform operator managing products, orders, and resellers

## What's Been Implemented

### Feb 11, 2026 - Ayolinx Sandbox Integration Fixed + Webhooks
- **Fixed HMAC signature computation** - StringToSign order corrected to METHOD:URL:TOKEN:BODYHASH:TIMESTAMP
- **Virtual Account (BNI)** - Fully working, returns VA number with 24h expiry
- **QRIS** - Fully working, returns QR code content and image URL
- **Payment Link** - API method added for hosted checkout flow
- **Payment Webhooks** - Unified callback handler for all payment types (VA/QRIS/Payment Link)
  - Callback maps Ayolinx status codes to order statuses (completed/failed/cancelled/refunded)
  - Updates order in MongoDB with payment details and timestamps
  - Endpoints: `/api/payment/callback/notify`, `/callback/va`, `/callback/qris`, `/callback/link`
  - Status check endpoint: `/api/payment/status/{order_id}`
- Correct PartnerServiceId values per bank channel (sandbox)

### Previous Implementation
- **Branding**: Blaze logo + mascots integrated across all pages
- **DigiFlazz Biller**: Fully integrated (balance check, products, top-up)
- **Backend**: FastAPI with MongoDB, JWT auth, product/order CRUD
- **Frontend**: React + Tailwind + Shadcn/UI, dark Blaze theme

## Core Requirements
- [x] Product catalog with categories (Games, Vouchers)
- [x] Product detail with denomination selection
- [x] User ID & Server ID input for top-up
- [x] Order creation and tracking
- [x] User authentication (JWT)
- [x] Reseller registration & dashboard
- [x] Admin dashboard
- [x] Dark Blaze theme with brand colors
- [x] Custom brand assets (Logo + Mascots)
- [x] Ayolinx payment integration (VA + QRIS + Payment Link)
- [x] DigiFlazz biller integration
- [x] Frontend connected to DigiFlazz catalog (cached)
- [ ] Google OAuth login
- [ ] Email notifications

## Key API Endpoints
- `POST /api/payment/create` - Create payment (VA/QRIS/Payment Link)
- `GET /api/payment/channels` - Available payment methods
- `GET /api/payment/status/{order_id}` - Check payment status from DB
- `POST /api/payment/callback/notify` - Unified Ayolinx webhook
- `POST /api/payment/callback/va` - VA-specific webhook
- `POST /api/payment/callback/qris` - QRIS-specific webhook
- `POST /api/payment/callback/link` - Payment Link webhook
- `GET /api/biller/balance` - DigiFlazz balance
- `GET /api/biller/products/games` - Game products from DigiFlazz
- `POST /api/biller/topup` - Process top-up via DigiFlazz

## Prioritized Backlog

### P0 - Critical (Next)
- [ ] Google OAuth login integration
- [ ] Set callback URL di Ayolinx merchant dashboard

### P1 - Important
- [ ] Product search with filters
- [ ] Reseller pricing tiers

### P2 - Nice to Have
- [ ] Email notifications for orders
- [ ] Promo codes / discount system
- [ ] WhatsApp bot integration
- [ ] Multi-language support

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), PyJWT, bcrypt, httpx, pycryptodome
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Axios
- **Payment**: Ayolinx (Virtual Account, QRIS, Payment Link)
- **Biller**: DigiFlazz (game vouchers, pulsa, etc.)

## Admin Credentials (Demo)
- Email: admin@voucherverse.com
- Password: admin123

---

## Multi-Site Replication System (added)

**Goal:** Run 5+ frontend variants from the same backend, each with different brand identity & gamer tone.

### Architecture
- `/app/sites/<name>/` — per-site React app cloned from `blaze`
- `/app/themes/<preset>.json` — theme presets (brand, colors, copy, fonts)
- `/app/frontend` → symlink to currently active site (default: blaze)
- `/app/scripts/` — replication & switching tools

### Source of truth per site
`src/theme.config.js` — driven by JSON preset, consumed by:
- `tailwind.config.js` (build-time colors, fonts, shadows)
- React components (Navbar, Footer, Home, Login, Register, Reseller) — brand name, assets, copy
- `src/index.css` — HSL `:root` CSS variables (cascades to all utility classes)
- `public/index.html` — title, meta description, theme-color

### Commands
```
/app/scripts/clone-site.sh <new_name> [preset]   # clone & retheme
/app/scripts/switch-site.sh <name>               # change active preview
/app/scripts/list-sites.sh                       # show available sites + active
```

### Built sites (all 5 active)
1. **blaze**       — red/gold esports (original master)         prefix `BLZ`
2. **neonforge**   — cyan/purple/magenta cyberpunk              prefix `NEO`
3. **pixelvault**  — orange/purple retro arcade (Press Start 2P) prefix `PXV`
4. **elitecharge** — gold/black premium luxury (Playfair serif)  prefix `ELC`
5. **raidstation** — army-green/red tactical military (Bebas Neue) prefix `RDS`

(plus `vortex` `VTX` legacy proxy forward target)

### What was completed this session (Feb 2026)
- Cleaned up legacy `Blaze*` JS variable names and `.blaze-*` CSS aliases from the master template; all brand identity now flows exclusively through `theme.config.js` per site (no hardcoded "Blaze" in clones).
- Created `/app/themes/pixelvault.json`, `/app/themes/elitecharge.json`, `/app/themes/raidstation.json`.
- Cloned and verified 3 new sites; all render with distinct visual themes; X-Site-Id header injected via axios interceptor → backend resolves correct order prefix.
- Backend `seed_multi_site_defaults` startup now auto-registers the 6 site_configs idempotently.
- Wired `ayolinx_service.refresh_from_db()` and `digiflazz_service.refresh_from_db()` so admin-panel-stored credentials override env vars at call time (DB-first, env-fallback). Applied in `routes/payment.py` (create, auto-topup) and `routes/biller.py` (router-level dependency).
- Patched local Babel visual-edits plugin to guard against null parentPath chain (fixed compile crash on cloned sites' `SitesTab.js`).
- Regression suite added by testing agent: `/app/backend/tests/test_multisite.py` (13/13 pass).

