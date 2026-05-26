// ============================================================================
// THEME CONFIGURATION — BlazeStore
// ============================================================================
// This file is the SINGLE SOURCE OF TRUTH for brand identity per site.
// Both `tailwind.config.js` (build-time colors) and React components (runtime
// brand strings/assets) consume this file. To replicate a new site, run:
//
//     /app/scripts/clone-site.sh <new_site_name>
//
// then edit ONLY this file + assets in /public.
// ============================================================================

const theme = {
  // -------- Identity --------
  siteId: 'blaze',                         // MUST match a /app/sites/<name> folder
                                           // and a site_configs.site_id row in DB.
  orderPrefix: 'BLZ',                      // 3-letter prefix used for X-Site-Id
                                           // fallback. Authoritative prefix lives
                                           // in MongoDB site_configs (admin panel).
  brand: {
    name: 'BlazeStore',                    // Full brand
    short: 'Blaze',                        // Short label (CTA accents)
    legalName: 'PT SENTOSA AWAN ABADI',    // Footer copyright
  },

  // -------- Page Meta (used by index.html template + dynamic) --------
  meta: {
    title: 'Blazestore | Top Up Game Instant dan Murah',
    description: 'Blazestore - Platform top-up game dan voucher digital terpercaya di Indonesia',
    themeColor: '#FF0000',
  },

  // -------- Visual Assets (paths under /public) --------
  assets: {
    logo: '/logo-blaze.svg',
    mascot: '/mascot1.svg',
    heroBg: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&q=80',
    favicon: '/favicon.svg',
  },

  // -------- Copy / Tone --------
  copy: {
    hero: {
      titleLine1: 'Top Up Game',
      titleLine2: 'Instant & Murah',
      subtitle: 'Platform top-up game dan voucher digital terpercaya. Proses cepat dalam hitungan detik, harga terbaik, dan layanan pelanggan 24/7.',
      searchPlaceholder: 'Cari game atau voucher...',
    },
    features: [
      { label: 'Instant', desc: 'Proses dalam detik' },
      { label: 'Murah',   desc: 'Harga terbaik' },
      { label: 'Aman',    desc: '100% Terpercaya' },
      { label: 'Support', desc: '24/7 via WhatsApp' },
    ],
    cta: {
      titlePrefix: 'Jadi Reseller ',
      titleHighlight: 'Blaze',
      titleSuffix: 'Store!',
      subtitle: 'Dapatkan harga spesial dan tingkatkan penghasilan Anda dengan menjadi reseller BlazeStore.',
      button: 'Daftar Reseller',
    },
    footer: {
      tagline: 'Platform top-up game dan voucher digital terpercaya di Indonesia. Proses cepat, harga terbaik, dan layanan 24/7.',
    },
  },

  // -------- Color Tokens (consumed by tailwind.config.js as HEX) --------
  // NOTE: index.css ALSO has matching HSL values — keep them in sync if you
  // change these. The clone-site.sh script updates both automatically.
  colors: {
    primary:    '#FF0000', // Brand accent (Blaze Red)
    secondary:  '#FFFFFF', // Contrast accent (Electric White)
    accent:     '#FFD700', // Highlight (Golden Coin)
    background: '#050A18', // Page background (Deep Midnight)
    card:       '#0D1526', // Card surface
    border:     '#2D3436', // Borders/dividers (Circuit Grey)
    foreground: '#FFFFFF',
    success:    '#22C55E',
    destructive:'#FF3B30',
    // Optional gradient stops for `.brand-gradient` text class
    gradientFrom: '#FF0000',
    gradientTo:   '#FFD700',
  },

  // -------- Typography (Google Fonts loaded in index.css) --------
  fonts: {
    display: "'Rajdhani', 'Space Grotesk', sans-serif",
    body:    "'Plus Jakarta Sans', 'Inter', sans-serif",
    mono:    "'JetBrains Mono', monospace",
  },

  // -------- Visual Style Modifiers (tone hooks per site) --------
  style: {
    // Used by Home.js hero — applied as inline filter on mascot.
    mascotGlow: 'drop-shadow(0 0 30px rgba(255, 0, 0, 0.4))',
    // Used by hero CTA glow
    heroAccent1: 'bg-primary/20',
    heroAccent2: 'bg-accent/20',
  },
};

module.exports = theme;
