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
- [ ] Google OAuth login
- [ ] Connect Frontend to Biller API
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
- [ ] Connect Frontend to DigiFlazz Biller API (product list, checkout flow)

### P1 - Important
- [ ] Payment callback webhooks (update order status)
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
