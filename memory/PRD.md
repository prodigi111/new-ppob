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
- Ayolinx payment (MOCKED for now)

## Brand Identity - Blaze Theme
- **Blaze Red**: #FF0000 (Primary)
- **Electric White**: #FFFFFF (Secondary)
- **Golden Coin**: #FFD700 (Accent)
- **Deep Midnight**: #050A18 (Background)
- **Circuit Grey**: #2D3436 (Muted)
- **Logo**: Custom Blaze logo with flame icon
- **Mascot**: Flame character with gaming controller

## User Personas
1. **Gamers** - End users who want to top up game currencies (diamonds, UC, etc.)
2. **Resellers** - Business users who sell vouchers and want special pricing
3. **Admin** - Platform operator managing products, orders, and resellers

## Core Requirements (Static)
- [x] Product catalog with categories (Games, Vouchers)
- [x] Product detail with denomination selection
- [x] User ID & Server ID input for top-up
- [x] Order creation and tracking
- [x] User authentication (JWT)
- [x] Reseller registration & dashboard
- [x] Admin dashboard (products, orders, users, reseller approval)
- [x] Dark Blaze theme with brand colors
- [x] Custom brand assets (Logo + Mascots)
- [ ] Ayolinx payment integration (requires credentials)

## What's Been Implemented

### Latest Update (Feb 2026)
- **Brand Assets Integration**:
  - Blaze logo integrated into Navbar
  - Mascot #1 displayed in Homepage hero section with float animation
  - Mascot #1 displayed in Homepage CTA section
  - Both Mascots displayed in Reseller page hero (decorative)
  - Custom CSS animations (float, glow effects)

### Backend (FastAPI + MongoDB)
- User authentication (register, login, JWT tokens)
- Product CRUD with denominations
- Order management (create, track, list)
- Reseller system (apply, dashboard, balance top-up mock)
- Admin dashboard (stats, manage orders/users/products/resellers)
- Mock payment processing

### Frontend (React + Tailwind + Shadcn)
- Home page with product catalog and mascot
- Category filtering and search
- Product detail page with denomination selection
- Checkout page with mock payment
- Transaction tracking
- User profile with order history
- **Reseller Landing Page (Uniplay-style):**
  - Hero with social proof stats + mascots decoration
  - 6 Benefit cards (Tanpa Deposit, Sistem Otomatis, Website Sendiri, dll)
  - **Domain Checker** - Cek ketersediaan domain independent (.com, .id, .co.id, .net, .store, .shop) dengan harga
  - Interactive Profit Calculator with sliders
  - 3-Tier Pricing (Pro, Legend, Supreme) with billing toggle
  - Wall of Fame testimonials
  - FAQ section
- Reseller Dashboard (Tabs: Overview, Transaksi, Top Up Saldo, **Deploy Website**)
  - **Deploy Website Feature**:
    - Konfigurasi: Nama Toko, **Custom Domain** (.com/.id/.store), Tagline, WhatsApp
    - 6 Theme pilihan (Neon Cyber, Sunset Blaze, Ocean Wave, dll)
    - Live Preview dengan toggle Desktop/Mobile
    - **DNS Setup Instructions** untuk konfigurasi domain sendiri
    - One-click Deploy dengan status indicator
    - Fitur SSL gratis dan Auto Sync produk
- Admin dashboard with tabs
- Blaze theme with brand colors and custom assets

### Database Collections
- users (id, email, name, role, balance, password)
- products (id, name, slug, category, image, denominations)
- orders (id, order_number, user_id, product_id, status, price)
- reseller_applications (id, user_id, phone, business_name, status)

### Asset Files
- `/app/frontend/src/assets/logo-blaze.svg` - Main logo
- `/app/frontend/src/assets/mascot1.svg` - Primary mascot
- `/app/frontend/src/assets/mascot2.svg` - Secondary mascot

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Real Ayolinx payment integration (when credentials available)
- [ ] Email notifications for orders

### P1 - Important
- [ ] Webhooks for payment status updates
- [ ] Order status email notifications
- [ ] Product search with filters
- [ ] Reseller pricing tiers

### P2 - Nice to Have
- [ ] Promo codes / discount system
- [ ] Referral program
- [ ] WhatsApp bot integration
- [ ] Multi-language support

## Next Tasks
1. Get Ayolinx API credentials from client to implement real payment
2. Add email notification system (SendGrid/Resend)
3. Implement affiliate/referral tracking
4. Add promo code functionality

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), PyJWT, bcrypt
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Axios
- **Payment**: Mock (Ayolinx ready when credentials available)

## Admin Credentials (Demo)
- Email: admin@voucherverse.com
- Password: admin123
