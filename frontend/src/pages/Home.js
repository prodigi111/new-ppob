import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GameCard, GameCardSkeleton } from '../components/GameCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Search, Zap, Clock, Shield, Tag, Headphones } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = [
  { id: 'all', name: 'Semua' },
  { id: 'game', name: 'Games' },
  { id: 'voucher', name: 'Voucher' },
];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
    seedData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, activeCategory, searchQuery]);

  const seedData = async () => {
    try {
      await axios.post(`${API_URL}/api/seed`);
    } catch (error) {
      // Data might already be seeded
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products`);
      setProducts(response.data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

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
            backgroundImage: `url('https://images.unsplash.com/photo-1701377000907-64f247c931f0?w=1920&q=80')`,
          }}
        />
        <div className="hero-overlay absolute inset-0" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-2xl">
            <h1 className="font-rajdhani font-bold text-4xl sm:text-5xl lg:text-6xl text-white uppercase tracking-tight mb-4">
              Top Up Game <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                Instant & Murah
              </span>
            </h1>
            <p className="text-gray-300 text-base md:text-lg mb-8 max-w-xl">
              Platform top-up game dan voucher digital terpercaya. Proses cepat dalam hitungan detik, 
              harga terbaik, dan layanan pelanggan 24/7.
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari game atau voucher..."
                className="pl-12 pr-4 py-6 bg-black/50 border-white/10 text-white placeholder:text-gray-500 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="search-input"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-white">Instant</h3>
                <p className="text-xs text-muted-foreground">Proses dalam detik</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center flex-shrink-0">
                <Tag className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-white">Murah</h3>
                <p className="text-xs text-muted-foreground">Harga terbaik</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-white">Aman</h3>
                <p className="text-xs text-muted-foreground">100% Terpercaya</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Headphones className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-rajdhani font-semibold text-white">Support</h3>
                <p className="text-xs text-muted-foreground">24/7 via WhatsApp</p>
              </div>
            </div>
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
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 p-8 md:p-12">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 max-w-xl">
              <h2 className="font-rajdhani font-bold text-2xl md:text-3xl text-white uppercase mb-4">
                Jadi Reseller Sekarang!
              </h2>
              <p className="text-gray-300 mb-6">
                Dapatkan harga spesial dan tingkatkan penghasilan Anda dengan menjadi reseller VoucherVerse.
              </p>
              <Button 
                className="bg-white text-black hover:bg-gray-100 font-rajdhani uppercase tracking-wider"
                onClick={() => window.location.href = '/reseller'}
                data-testid="cta-reseller-btn"
              >
                Daftar Reseller
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
