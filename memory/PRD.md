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
- DigiFlazz biller integration (planned)

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
- [x] Ayolinx payment integration (Virtual Account + QRIS)
- [ ] Google OAuth login
- [ ] DigiFlazz biller integration (requires credentials)

## What's Been Implemented

### Latest Update (Feb 2026)
- **Ayolinx Payment Gateway Integration**:
  - Virtual Account support (BCA, BNI, BRI, Mandiri, Permata, CIMB)
  - QRIS payment support
  - Payment callback webhooks
  - Updated Checkout page with payment method selection
  - Credentials stored in backend/.env

- **Brand Assets Integration**:
  - Blaze logo integrated into Navbar, Footer, Login, Register
  - Mascot #1 displayed in Homepage hero section with float animation
  - Mascot #1 displayed in Homepage CTA section
  - Both Mascots displayed in Reseller page hero (decorative)
  - All "VoucherVerse" text changed to "BlazeStore"

### Backend (FastAPI + MongoDB)
- User authentication (register, login, JWT tokens)
- Product CRUD with denominations
- Order management (create, track, list)
- Reseller system (apply, dashboard, balance top-up mock)
- Admin dashboard (stats, manage orders/users/products/resellers)
- **Ayolinx Payment Service** (`/app/backend/services/ayolinx.py`)
- **Payment Routes** (`/app/backend/routes/payment.py`)

### Frontend (React + Tailwind + Shadcn)
- Home page with product catalog and mascot
- Category filtering and search
- Product detail page with denomination selection
- **Enhanced Checkout page** with:
  - Payment method selection (VA/QRIS)
  - Bank selection for Virtual Account
  - VA number display with copy function
  - QRIS QR code display
- Transaction tracking
- User profile with order history
- Reseller Landing Page (Uniplay-style)
- Reseller Dashboard with Deploy Website feature
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

### P0 - Critical (Next)
- [ ] Google OAuth login integration
- [ ] DigiFlazz biller integration (requires user credentials)

### P1 - Important
- [ ] Email notifications for orders
- [ ] Webhooks for payment status updates
- [ ] Product search with filters
- [ ] Reseller pricing tiers

### P2 - Nice to Have
- [ ] Promo codes / discount system
- [ ] Referral program
- [ ] WhatsApp bot integration
- [ ] Multi-language support

## Next Tasks
1. Implement Google OAuth via Emergent-managed auth
2. Get DigiFlazz credentials from client for biller integration
3. Add email notification system (SendGrid/Resend)
4. Implement affiliate/referral tracking

## Tech Stack
- **Backend**: FastAPI, MongoDB (Motor), PyJWT, bcrypt, httpx, pycryptodome
- **Frontend**: React 19, Tailwind CSS, Shadcn/UI, Axios
- **Payment**: Ayolinx (Virtual Account, QRIS)
- **Biller**: DigiFlazz (planned, requires credentials)

## API Credentials
- **Ayolinx**: Configured in `/app/backend/.env`
  - Client Key: CK-8bee7385-bc44-4577-805b-33d12336ed70
  - Customer No: 391

## Admin Credentials (Demo)
- Email: admin@voucherverse.com
- Password: admin123
