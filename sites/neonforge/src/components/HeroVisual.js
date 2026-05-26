import React from 'react';
import theme from '../theme.config';

/**
 * HeroVisual — site-specific decorative visual that replaces the legacy mascot.
 * Variant is driven by `theme.style.heroVisual` (string token). Each variant
 * is pure CSS/SVG, no external image assets needed, so cloned sites look
 * distinct without relying on illustrations.
 *
 * Tokens supported:
 *   - 'controller-orb'   (default — concentric pulsing rings)
 *   - 'circuit-grid'     (cyberpunk grid + scanline)
 *   - 'pixel-tiles'      (8-bit blocky tiles)
 *   - 'gold-orbs'        (premium glass orbs)
 *   - 'crosshair-radar'  (tactical radar sweep)
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
  // 6x6 retro pixel grid
  const tiles = Array.from({ length: 36 });
  return (
    <div className="relative w-80 h-80 grid grid-cols-6 grid-rows-6 gap-1 p-3 bg-black/40 rounded-xl border-4 border-primary/60 shadow-[8px_8px_0_0_hsl(var(--secondary))]">
      {tiles.map((_, i) => {
        const palette = [
          'bg-primary',
          'bg-secondary',
          'bg-accent',
          'bg-success',
          'bg-background',
        ];
        const cls = palette[(i * 7) % palette.length];
        return (
          <div
            key={i}
            className={`${cls} animate-pixel-pulse`}
            style={{ animationDelay: `${(i % 12) * 0.08}s` }}
          />
        );
      })}
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
      {/* Concentric range rings */}
      {[0.85, 0.65, 0.45, 0.25].map((scale, i) => (
        <div
          key={i}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40"
          style={{ width: `${scale * 100}%`, height: `${scale * 100}%` }}
        />
      ))}
      {/* Crosshair lines */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-primary/40 -translate-x-1/2" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/40 -translate-y-1/2" />
      {/* Sweeping radar arm */}
      <div
        className="absolute left-1/2 top-1/2 w-1/2 h-px origin-left animate-radar-sweep"
        style={{
          background: 'linear-gradient(to right, hsl(var(--accent)), transparent)',
        }}
      />
      {/* Targets */}
      <div className="absolute left-[60%] top-[35%] w-2 h-2 rounded-full bg-secondary animate-pulse" />
      <div className="absolute left-[30%] top-[60%] w-2 h-2 rounded-full bg-accent animate-pulse" />
      <div className="absolute right-4 top-4 font-mono text-xs text-primary/80 tracking-widest">
        [ {theme.brand.short.toUpperCase()}-RADAR ]
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
