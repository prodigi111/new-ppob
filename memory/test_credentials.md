# Test Credentials — Multi-Site Top-Up Platform

## Admin
- Email: `admin@voucherverse.com`
- Password: `admin123`

## Active Sites & Order Prefixes
| Site ID      | Brand        | Prefix | Theme              |
|--------------|--------------|--------|--------------------|
| blaze        | BlazeStore   | BLZ    | Original (master)  |
| neonforge    | NeonForge    | NEO    | Cyberpunk          |
| pixelvault   | PixelVault   | PXV    | Retro Arcade       |
| elitecharge  | EliteCharge  | ELC    | Premium / Luxury   |
| raidstation  | RaidStation  | RDS    | Tactical Military  |
| vortex       | Vortex (proxy) | VTX  | Proxy forward only |

## Order ID Format
`LLLYYYYMMDDHHMMSSXXXX` — e.g. `NEO20260416070531D54F`
- LLL = 3-letter prefix (derived from `X-Site-Id` header → DB lookup → fallback `BLZ`)
- 14-digit local timestamp
- 4-hex random (uppercase)

## Notes
- Same backend serves all 5 sites; site is identified by `X-Site-Id` header set by frontend.
- Switch active frontend: `/app/scripts/switch-site.sh <site_id>`.
- Reseller users created via `/register?as=reseller`.
- Ayolinx / DigiFlazz credentials configurable from admin panel → "Integrasi" tab; DB-first, env-fallback.
