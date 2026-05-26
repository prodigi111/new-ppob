import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GameCard, GameCardSkeleton } from '../components/GameCard';
import { useStore } from '../context/StoreContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Zap, Clock, Shield, Tag, Headphones } from 'lucide-react';
import theme from '../theme.config';
const BlazeMascot = theme.assets.mascot;
const HERO_BG = theme.assets.heroBg;
const COPY = theme.copy;

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { id: 'all', name: 'Semua' },
  { id: 'games', name: 'Games' },
  { id: 'pulsa', name: 'Pulsa' },
  { id: 'voucher', name: 'Voucher' },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [digiflazzBrands, setDigiflazzBrands] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, digiflazzBrands, activeCategory, searchQuery]);

  const fetchAll = async () => {
    try {
      // Fetch both seed products and DigiFlazz catalog in parallel
      const [seedRes, catalogRes] = await Promise.allSettled([
        axios.get(`${API_URL}/api/products`),
        axios.get(`${API_URL}/api/biller/catalog`),
      ]);

      if (seedRes.status === 'fulfilled') {
        setProducts(seedRes.value.data.products || []);
      }

      if (catalogRes.status === 'fulfilled' && catalogRes.value.data.success) {
        setDigiflazzBrands(catalogRes.value.data.brands || []);
      }

      // Seed data on first visit
      try { await axios.post(`${API_URL}/api/seed`); } catch {}
    } catch (error) {
      console.error('Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    // Merge seed products + digiflazz brands into a unified list
    const allItems = [];

    // DigiFlazz brands as product cards
    for (const brand of digiflazzBrands) {
      allItems.push({
        id: `df-${brand.slug}`,
        slug: `df/${brand.slug}`,
        name: brand.brand,
        image: brand.image,
        category: brand.category,
        source: 'digiflazz',
        itemCount: brand.items.length,
        startPrice: Math.min(...brand.items.map(i => i.price)),
      });
    }

    // Seed products (only if not already covered by DigiFlazz)
    const dfNames = new Set(digiflazzBrands.map(b => b.brand.toLowerCase()));
    for (const p of products) {
      if (!dfNames.has(p.name.toLowerCase())) {
        // Map seed categories to new format
        const catMap = { game: 'games', voucher: 'voucher' };
        allItems.push({ ...p, category: catMap[p.category] || p.category, source: 'seed' });
      }
    }

    let filtered = [...allItems];

    if (activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === activeCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('${HERO_BG}')`,
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        {/* Fire accent glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left - Text Content */}
            <div className="max-w-2xl">
              <h1 className="font-rajdhani font-bold text-4xl sm:text-5xl lg:text-6xl text-white uppercase tracking-tight mb-4">
                {COPY.hero.titleLine1} <br />
                <span className="brand-gradient">
                  {COPY.hero.titleLine2}
                </span>
              </h1>
              <p className="text-gray-300 text-base md:text-lg mb-8 max-w-xl">
                {COPY.hero.subtitle}
              </p>

              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={COPY.hero.searchPlaceholder}
                  className="pl-12 pr-4 py-6 bg-black/50 border-primary/20 text-white placeholder:text-gray-500 rounded-xl focus:border-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="search-input"
                />
              </div>
            </div>

            {/* Right - Mascot */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative">
                {/* Glow effect behind mascot */}
                <div className="absolute inset-0 bg-primary/30 rounded-full blur-3xl scale-75 animate-pulse" />
                <img 
                  src={BlazeMascot} 
                  alt={theme.brand.name + ' Mascot'} 
                  className="relative z-10 w-80 h-80 object-contain drop-shadow-2xl animate-float"
                  style={{
                    filter: theme.style.mascotGlow
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {(() => {
              const featureIcons = [Zap, Tag, Shield, Headphones];
              const featureTones = ['bg-primary/20 text-primary fire-glow', 'bg-secondary/20 text-secondary', 'bg-success/20 text-success', 'bg-accent/20 text-accent'];
              return COPY.features.map((f, idx) => {
                const Icon = featureIcons[idx % featureIcons.length];
                const [bgCls, ...rest] = featureTones[idx % featureTones.length].split(' ');
                const toneCls = featureTones[idx % featureTones.length];
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${toneCls.replace(/text-\S+/g, '')}`}>
                      <Icon className={`w-6 h-6 ${toneCls.match(/text-\S+/)?.[0] || 'text-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-rajdhani font-semibold text-white">{f.label}</h3>
                      <p className="text-xs text-muted-foreground">{f.desc}</p>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? 'default' : 'ghost'}
                className={`font-rajdhani uppercase tracking-wider ${
                  activeCategory === cat.id 
                    ? 'bg-primary hover:bg-primary/90' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setActiveCategory(cat.id)}
                data-testid={`category-${cat.id}`}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {[...Array(10)].map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
              {filteredProducts.map((product) => (
                <GameCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">Tidak ada produk ditemukan</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 to-accent/10 p-8 md:p-12 border border-primary/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative z-10 flex items-center justify-between">
              <div className="max-w-xl">
                <h2 className="font-rajdhani font-bold text-2xl md:text-3xl text-white uppercase mb-4">
                  {COPY.cta.titlePrefix}<span className="text-primary">{COPY.cta.titleHighlight}</span>{COPY.cta.titleSuffix}
                </h2>
                <p className="text-gray-300 mb-6">
                  {COPY.cta.subtitle}
                </p>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider brand-btn"
                  onClick={() => window.location.href = '/reseller'}
                  data-testid="cta-reseller-btn"
                >
                  {COPY.cta.button}
                </Button>
              </div>
              
              {/* Mascot in CTA */}
              <div className="hidden md:block">
                <img 
                  src={BlazeMascot} 
                  alt={theme.brand.name + ' Mascot'} 
                  className="w-48 h-48 object-contain animate-float"
                  style={{ filter: theme.style.mascotGlow }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
