import React from 'react';
import theme from '../theme.config';

/**
 * HeroVisual — site-specific decorative visual that replaces the legacy mascot.
 * Variant is driven by `theme.style.heroVisual` (string token). Each variant
 * is pure CSS/SVG, no external image assets needed.
 *
 * Tokens supported:
 *   - 'controller-orb'   (default — concentric pulsing rings)
 *   - 'circuit-grid'     (cyberpunk grid + scanline)
 *   - 'pixel-tiles'      (8-bit blocky tiles)
 *   - 'gold-orbs'        (premium glass orbs)
 *   - 'crosshair-radar'  (tactical radar sweep)
 *   - 'deep-abyss'       (deep-sea jellyfish + bioluminescent particles)
 *   - 'terminal-feed'    (matrix code rain on black + terminal log)
 * Any unknown value falls back to 'controller-orb'.
 */
const VARIANT = (theme.style && theme.style.heroVisual) || 'controller-orb';

function ControllerOrb() {
  return (
    <div className="relative w-80 h-80">
      <div className="absolute inset-0 rounded-full bg-primary/20 blur-3xl animate-pulse" />
      <div className="absolute inset-6 rounded-full border-2 border-primary/40 animate-spin-slow" />
      <div className="absolute inset-14 rounded-full border-2 border-accent/40" />
      <div className="absolute inset-24 rounded-full bg-gradient-to-br from-primary to-accent shadow-2xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 rounded-full border-4 border-white/10 backdrop-blur-sm bg-gradient-to-tr from-primary/30 to-accent/30" />
      </div>
    </div>
  );
}

function CircuitGrid() {
  return (
    <div className="relative w-80 h-80 overflow-hidden rounded-2xl border border-primary/30 bg-black/40">
      <div
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(hsl(var(--primary) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.4) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-secondary/30 via-transparent to-accent/40" />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-accent/60 blur-2xl animate-pulse" />
      <div className="absolute left-0 right-0 h-1 bg-primary/70 animate-scan" />
      <div className="absolute right-4 bottom-4 font-mono text-xs text-primary/80 tracking-widest">
        // {theme.brand.short.toUpperCase()}_GRID.SYS
      </div>
    </div>
  );
}

function PixelTiles() {
  const tiles = Array.from({ length: 36 });
  const palette = ['bg-primary', 'bg-secondary', 'bg-accent', 'bg-success', 'bg-background'];
  return (
    <div className="relative w-80 h-80 grid grid-cols-6 grid-rows-6 gap-1 p-3 bg-black/40 rounded-xl border-4 border-primary/60 shadow-[8px_8px_0_0_hsl(var(--secondary))]">
      {tiles.map((_, i) => (
        <div
          key={i}
          className={`${palette[(i * 7) % palette.length]} animate-pixel-pulse`}
          style={{ animationDelay: `${(i % 12) * 0.08}s` }}
        />
      ))}
    </div>
  );
}

function GoldOrbs() {
  return (
    <div className="relative w-80 h-80">
      <div className="absolute left-10 top-10 w-40 h-40 rounded-full bg-gradient-to-br from-primary to-accent opacity-80 blur-sm shadow-2xl" />
      <div className="absolute right-6 bottom-12 w-28 h-28 rounded-full bg-gradient-to-br from-accent/70 to-primary/40 backdrop-blur-md border border-primary/30" />
      <div className="absolute right-16 top-6 w-20 h-20 rounded-full border-2 border-primary/60" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="font-serif italic text-7xl text-primary/40 select-none">
          {theme.brand.short[0]}
        </div>
      </div>
    </div>
  );
}

function CrosshairRadar() {
  return (
    <div className="relative w-80 h-80 rounded-full border-2 border-primary/60 bg-radial-radar overflow-hidden">
      {[0.85, 0.65, 0.45, 0.25].map((scale, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40"
          style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
        />
      ))}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40 -translate-x-1/2" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40 -translate-y-1/2" />
      <div
        className="absolute left-1/2 top-1/2 w-1/2 h-px origin-left animate-radar-sweep"
        style={{ background: 'linear-gradient(to right, hsl(var(--accent)), transparent)' }}
      />
      <div className="absolute left-[60%] top-[35%] w-2 h-2 rounded-full bg-secondary animate-pulse" />
      <div className="absolute left-[30%] top-[60%] w-2 h-2 rounded-full bg-accent animate-pulse" />
      <div className="absolute right-4 top-4 font-mono text-xs text-primary/80 tracking-widest">
        [ {theme.brand.short.toUpperCase()}-RADAR ]
      </div>
    </div>
  );
}

function DeepAbyss() {
  const particles = Array.from({ length: 18 });
  const tentacles = [30, 50, 70, 90, 110];
  const smallTentacles = [14, 26, 38, 50];
  return (
    <div className="relative w-80 h-80 rounded-3xl overflow-hidden bg-gradient-to-b from-[#001018] via-[#000812] to-black border border-primary/30">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent" />
      <div className="absolute -top-10 left-10 w-2 h-72 bg-gradient-to-b from-primary/40 to-transparent rotate-6 blur-sm" />
      <div className="absolute -top-10 right-20 w-1 h-64 bg-gradient-to-b from-primary/30 to-transparent -rotate-3 blur-sm" />
      <div className="absolute -top-10 left-40 w-1.5 h-60 bg-gradient-to-b from-secondary/30 to-transparent rotate-12 blur" />
      {particles.map((_, i) => {
        const left = (i * 53) % 100;
        const top = (i * 37 + 7) % 100;
        const size = 2 + (i % 3);
        return (
          <span
            key={i}
            className="absolute rounded-full bg-primary animate-pulse"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              boxShadow: '0 0 8px currentColor, 0 0 14px currentColor',
              animationDelay: `${(i * 0.4) % 5}s`,
              animationDuration: `${2 + (i % 3)}s`,
            }}
          />
        );
      })}
      <div className="absolute left-1/2 top-[28%] -translate-x-1/2 animate-float-slow">
        <svg width="140" height="160" viewBox="0 0 140 160">
          <defs>
            <radialGradient id="jelly1" cx="50%" cy="35%" r="60%">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.9" />
              <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M20 60 Q70 -10 120 60 L120 70 Q70 60 20 70 Z" fill="url(#jelly1)" />
          <path d="M30 50 Q70 0 110 50" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
          <path d="M40 40 Q70 8 100 40" fill="none" stroke="white" strokeOpacity="0.2" strokeWidth="1" />
          {tentacles.map((x, i) => (
            <path
              key={i}
              d={`M${x} 70 Q${x - 4} 100 ${x + 3} 130 Q${x - 3} 150 ${x + 1} 160`}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeOpacity="0.55"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          ))}
          <circle cx="70" cy="50" r="6" fill="white" opacity="0.7" />
        </svg>
      </div>
      <div className="absolute right-4 top-10 animate-float-slow" style={{ animationDelay: '1.2s' }}>
        <svg width="70" height="90" viewBox="0 0 70 90">
          <path d="M8 30 Q35 0 62 30 L62 35 Q35 30 8 35 Z" fill="hsl(var(--accent))" fillOpacity="0.5" />
          {smallTentacles.map((x, i) => (
            <path
              key={i}
              d={`M${x} 35 Q${x - 2} 55 ${x + 1} 80`}
              fill="none"
              stroke="hsl(var(--accent))"
              strokeOpacity="0.6"
              strokeWidth="1"
            />
          ))}
        </svg>
      </div>
      <div className="absolute left-3 bottom-3 font-mono text-[10px] tracking-[0.3em] text-primary/70">
        -2400m · ABYSS
      </div>
    </div>
  );
}

function TerminalFeed() {
  const lines = [
    '> initialize quantum.node',
    '  loading kernel...........[OK]',
    '  handshake digiflazz......[OK]',
    '  link ayolinx.tx..........[OK]',
    '> deploy --order=QTM-7341',
    '  signing.................[OK]',
    '  routing.................[OK]',
    '> drop sequence engaged_',
  ];
  const cols = Array.from({ length: 14 });
  const promptLabel = `${theme.brand.short.toLowerCase()}@core ~ %`;
  return (
    <div className="relative w-80 h-80 rounded-xl overflow-hidden bg-black border border-primary/60 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
      <div className="absolute inset-0 opacity-60">
        {cols.map((_, i) => {
          const ch1 = String.fromCharCode(0x30a0 + (i * 13) % 96);
          const ch2 = String.fromCharCode(0x30a0 + (i * 7) % 96);
          const ch3 = String.fromCharCode(0x30a0 + (i * 23) % 96);
          const ch4 = String.fromCharCode(0x30a0 + (i * 17) % 96);
          const num = (i * 1297) % 9999;
          return (
            <span
              key={i}
              className="absolute top-0 font-mono text-[10px] text-primary animate-rain"
              style={{
                left: `${(i * 7.5) % 100}%`,
                animationDelay: `${(i * 0.4) % 3}s`,
                animationDuration: `${4 + (i % 4)}s`,
                writingMode: 'vertical-rl',
                textShadow: '0 0 6px currentColor',
              }}
            >
              {ch1}{ch2}{ch3} 01101 {ch4} {num}
            </span>
          );
        })}
      </div>
      <div className="absolute left-3 right-3 bottom-3 bg-black/85 border border-primary/50 rounded-md p-3 backdrop-blur-sm">
        <div className="flex items-center gap-1 mb-2">
          <span className="w-2 h-2 rounded-full bg-destructive/80" />
          <span className="w-2 h-2 rounded-full bg-accent/80" />
          <span className="w-2 h-2 rounded-full bg-primary/80" />
          <span className="ml-2 font-mono text-[10px] text-primary/70 tracking-widest">
            {promptLabel}
          </span>
        </div>
        {lines.map((ln, i) => (
          <div
            key={i}
            className="font-mono text-[10px] leading-relaxed text-primary"
            style={{ opacity: 0.55 + (i / lines.length) * 0.45 }}
          >
            {ln}
          </div>
        ))}
        <span className="inline-block w-2 h-3 bg-primary animate-pulse align-middle ml-1" />
      </div>
    </div>
  );
}

const VARIANTS = {
  'controller-orb': ControllerOrb,
  'circuit-grid': CircuitGrid,
  'pixel-tiles': PixelTiles,
  'gold-orbs': GoldOrbs,
  'crosshair-radar': CrosshairRadar,
  'deep-abyss': DeepAbyss,
  'terminal-feed': TerminalFeed,
};

export default function HeroVisual({ className = '', compact = false }) {
  const Component = VARIANTS[VARIANT] || ControllerOrb;
  return (
    <div
      data-testid="hero-visual"
      className={`relative ${compact ? 'scale-75' : ''} ${className}`}
    >
      <Component />
    </div>
  );
}
