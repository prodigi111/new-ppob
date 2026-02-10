# VoucherVerse - Digital Voucher Marketplace

## Original Problem Statement
Build a digital voucher marketplace website similar to Uniplay (https://uniplay.id/) with:
- Product catalog for game vouchers
- Top-up with game ID input
- Transaction history & order tracking
- Admin dashboard
- Reseller feature
- JWT + Google social login
- Dark mode, fun style for young gamers
- Ayolinx payment (MOCKED for now)

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
- [x] Dark cyberpunk theme
- [ ] Ayolinx payment integration (requires credentials)
- [ ] Google OAuth integration

## What's Been Implemented (Jan 2026)

### Backend (FastAPI + MongoDB)
- User authentication (register, login, JWT tokens)
- Product CRUD with denominations
- Order management (create, track, list)
- Reseller system (apply, dashboard, balance top-up mock)
- Admin dashboard (stats, manage orders/users/products/resellers)
- Mock payment processing

### Frontend (React + Tailwind + Shadcn)
- Home page with product catalog
- Category filtering and search
- Product detail page with denomination selection
- Checkout page with mock payment
- Transaction tracking
- User profile with order history
- **Reseller Landing Page (Uniplay-style):**
  - Hero with social proof stats (Total Omzet, Transaksi, Reseller Aktif)
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
- Dark cyberpunk theme with neon accents

### Database Collections
- users (id, email, name, role, balance, password)
- products (id, name, slug, category, image, denominations)
- orders (id, order_number, user_id, product_id, status, price)
- reseller_applications (id, user_id, phone, business_name, status)

## Prioritized Backlog

### P0 - Critical (Next Phase)
- [ ] Real Ayolinx payment integration (when credentials available)
- [ ] Google OAuth integration
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
2. Implement Google OAuth via Emergent-managed auth
3. Add email notification system (SendGrid/Resend)
4. Implement affiliate/referral tracking
5. Add promo code functionality

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), PyJWT, bcrypt
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Axios
- **Payment**: Mock (Ayolinx ready when credentials available)

## Admin Credentials (Demo)
- Email: admin@voucherverse.com
- Password: admin123
