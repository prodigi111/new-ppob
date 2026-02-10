import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';
import { 
  Users, 
  Zap, 
  TrendingUp, 
  BadgePercent,
  CheckCircle2,
  ArrowRight,
  Rocket,
  Globe,
  CreditCard,
  Shield,
  Sparkles,
  Calculator,
  Star,
  Crown,
  Trophy,
  ChevronRight,
  Check,
  X,
  Gift,
  Headphones,
  BookOpen,
  Smartphone,
  Search,
  ExternalLink,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Reseller Packages
const PACKAGES = [
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    color: 'secondary',
    monthlyPrice: 99000,
    yearlyPrice: 799000,
    discount: 33,
    features: [
      { name: 'Akses Harga Reseller', included: true },
      { name: 'Dashboard Reseller', included: true },
      { name: 'Subdomain Gratis', included: true },
      { name: 'Custom Domain', included: false },
      { name: 'Unlimited Transaksi', included: true },
      { name: 'Support WhatsApp', included: true },
      { name: 'Support Prioritas', included: false },
      { name: 'Reseller Academy', included: false },
      { name: 'Kupon Diskon Custom', included: false },
    ]
  },
  {
    id: 'legend',
    name: 'Legend',
    icon: Crown,
    color: 'primary',
    popular: true,
    monthlyPrice: 199000,
    yearlyPrice: 1599000,
    discount: 33,
    features: [
      { name: 'Akses Harga Reseller', included: true },
      { name: 'Dashboard Reseller', included: true },
      { name: 'Subdomain Gratis', included: true },
      { name: 'Custom Domain', included: true },
      { name: 'Unlimited Transaksi', included: true },
      { name: 'Support WhatsApp', included: true },
      { name: 'Support Prioritas', included: true },
      { name: 'Reseller Academy', included: true },
      { name: 'Kupon Diskon Custom', included: false },
    ]
  },
  {
    id: 'supreme',
    name: 'Supreme',
    icon: Trophy,
    color: 'accent',
    monthlyPrice: 349000,
    yearlyPrice: 2799000,
    discount: 33,
    features: [
      { name: 'Akses Harga Reseller', included: true },
      { name: 'Dashboard Reseller', included: true },
      { name: 'Subdomain Gratis', included: true },
      { name: 'Custom Domain', included: true },
      { name: 'Unlimited Transaksi', included: true },
      { name: 'Support WhatsApp', included: true },
      { name: 'Support Prioritas', included: true },
      { name: 'Reseller Academy', included: true },
      { name: 'Kupon Diskon Custom', included: true },
    ]
  }
];

const BENEFITS = [
  { 
    icon: CreditCard, 
    title: 'Tanpa Deposit', 
    description: 'Mulai tanpa modal deposit. Bayar sesuai paket yang dipilih.',
    color: 'primary'
  },
  { 
    icon: Zap, 
    title: 'Sistem Otomatis', 
    description: 'Semua proses top-up berjalan otomatis 24/7 tanpa ribet.',
    color: 'secondary'
  },
  { 
    icon: Globe, 
    title: 'Website Sendiri', 
    description: 'Dapatkan website profesional dengan domain sendiri.',
    color: 'success'
  },
  { 
    icon: TrendingUp, 
    title: 'Margin Tinggi', 
    description: 'Harga reseller jauh lebih murah, margin keuntungan besar.',
    color: 'accent'
  },
  { 
    icon: Users, 
    title: 'Pemula Friendly', 
    description: 'Tidak perlu keahlian teknis. Kami bantu setup semuanya.',
    color: 'primary'
  },
  { 
    icon: Shield, 
    title: 'Garansi 7 Hari', 
    description: 'Tidak cocok? Uang kembali 100% dalam 7 hari pertama.',
    color: 'destructive'
  },
];

const TESTIMONIALS = [
  {
    name: 'Rizky Pratama',
    store: 'topupgame.id',
    avatar: 'RP',
    rating: 5,
    comment: 'Sejak jadi reseller VoucherVerse, penghasilan naik 3x lipat. Sistemnya mudah dan support-nya responsif banget!',
    profit: 'Rp 15.000.000/bulan'
  },
  {
    name: 'Siti Nurhaliza',
    store: 'diamondstore.com',
    avatar: 'SN',
    rating: 5,
    comment: 'Awalnya ragu, tapi setelah 2 bulan omset tembus 50 juta! Recommended banget buat yang mau bisnis online.',
    profit: 'Rp 8.500.000/bulan'
  },
  {
    name: 'Ahmad Fauzi',
    store: 'gg-topup.id',
    avatar: 'AF',
    rating: 5,
    comment: 'Proses withdrawnya cepat, profit calculator-nya akurat. Cocok untuk pemula yang mau mulai bisnis.',
    profit: 'Rp 12.000.000/bulan'
  },
];

const STATS = [
  { label: 'Total Omzet Reseller', value: 'Rp 1.9M+', suffix: '' },
  { label: 'Total Transaksi', value: '40', suffix: ' Miliar' },
  { label: 'Reseller Aktif', value: '2,500', suffix: '+' },
  { label: 'Rating Kepuasan', value: '4.9', suffix: '/5' },
];

// Simulated taken domains for demo
const TAKEN_DOMAINS = {
  'com': ['topupgame', 'diamondstore', 'gamevoucher', 'topupku'],
  'id': ['topupgame', 'gg-topup'],
  'co.id': ['gamevoucher'],
  'net': ['topupgame'],
  'store': [],
};

// Domain extensions with prices
const DOMAIN_EXTENSIONS = [
  { ext: '.com', price: 150000, popular: true },
  { ext: '.id', price: 250000, popular: true },
  { ext: '.co.id', price: 200000, popular: false },
  { ext: '.net', price: 140000, popular: false },
  { ext: '.store', price: 180000, popular: true },
  { ext: '.shop', price: 170000, popular: false },
];

// Domain Checker Component
const DomainChecker = () => {
  const [domainInput, setDomainInput] = useState('');
  const [selectedExt, setSelectedExt] = useState('.com');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkDomain = async () => {
    if (!domainInput.trim()) {
      toast.error('Masukkan nama domain');
      return;
    }

    // Clean domain input (remove spaces, special chars)
    const cleanDomain = domainInput.toLowerCase().replace(/[^a-z0-9-]/g, '');
    
    setChecking(true);
    setResult(null);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Check availability for all extensions
    const extensionResults = DOMAIN_EXTENSIONS.map(ext => {
      const extKey = ext.ext.replace('.', '');
      const takenList = TAKEN_DOMAINS[extKey] || [];
      const isAvailable = !takenList.includes(cleanDomain);
      return {
        ...ext,
        available: isAvailable,
        fullDomain: `${cleanDomain}${ext.ext}`
      };
    });

    // Generate suggestions if main domain is taken
    const mainExtKey = selectedExt.replace('.', '');
    const mainTaken = (TAKEN_DOMAINS[mainExtKey] || []).includes(cleanDomain);
    
    const suggestions = mainTaken ? [
      `${cleanDomain}-store`,
      `${cleanDomain}id`,
      `my${cleanDomain}`,
      `${cleanDomain}shop`,
      `get${cleanDomain}`,
    ].slice(0, 4) : [];

    setResult({
      domain: cleanDomain,
      selectedExt,
      mainAvailable: !mainTaken,
      suggestions,
      extensions: extensionResults,
    });

    setChecking(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      checkDomain();
    }
  };

  return (
    <div className="bg-card rounded-2xl p-6 md:p-8 border border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
          <Globe className="w-6 h-6 text-secondary" />
        </div>
        <div>
          <h3 className="font-rajdhani font-bold text-xl text-white uppercase">Cek Domain</h3>
          <p className="text-sm text-muted-foreground">Dapatkan domain sendiri untuk website Anda</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Masukkan nama domain impianmu..."
            className="bg-black/50 border-white/10 text-white pl-4 py-6 text-lg"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyPress={handleKeyPress}
            data-testid="domain-input"
          />
        </div>
        <select
          className="bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white font-mono"
          value={selectedExt}
          onChange={(e) => setSelectedExt(e.target.value)}
        >
          {DOMAIN_EXTENSIONS.map(ext => (
            <option key={ext.ext} value={ext.ext}>
              {ext.ext} - {formatPrice(ext.price)}/thn
            </option>
          ))}
        </select>
        <Button
          className="bg-secondary hover:bg-secondary/90 text-black font-rajdhani uppercase px-8"
          onClick={checkDomain}
          disabled={checking}
          data-testid="check-domain-btn"
        >
          {checking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Search className="w-5 h-5 mr-2" />
              Cek Domain
            </>
          )}
        </Button>
      </div>

      {/* Quick Extension Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {DOMAIN_EXTENSIONS.filter(e => e.popular).map(ext => (
          <button
            key={ext.ext}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedExt === ext.ext
                ? 'bg-secondary/20 text-secondary border border-secondary/30'
                : 'bg-black/30 text-gray-400 border border-white/10 hover:border-white/30'
            }`}
            onClick={() => setSelectedExt(ext.ext)}
          >
            {ext.ext}
          </button>
        ))}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          {/* Main Result */}
          <div className={`p-4 rounded-xl border ${
            result.available 
              ? 'bg-success/10 border-success/30' 
              : 'bg-destructive/10 border-destructive/30'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.available ? (
                  <CheckCircle2 className="w-6 h-6 text-success" />
                ) : (
                  <X className="w-6 h-6 text-destructive" />
                )}
                <div>
                  <p className="font-mono text-lg text-white">
                    {result.domain}.voucherverse.com
                  </p>
                  <p className={`text-sm ${result.available ? 'text-success' : 'text-destructive'}`}>
                    {result.available ? 'Domain tersedia!' : 'Domain sudah digunakan'}
                  </p>
                </div>
              </div>
              {result.available && (
                <Button 
                  className="bg-success hover:bg-success/90 text-black font-rajdhani uppercase"
                  onClick={() => document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' })}
                >
                  Pilih Domain Ini
                </Button>
              )}
            </div>
          </div>

          {/* Suggestions if taken */}
          {!result.available && result.suggestions.length > 0 && (
            <div className="bg-black/20 rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-3">Saran domain alternatif:</p>
              <div className="grid grid-cols-2 gap-2">
                {result.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    className="flex items-center justify-between p-3 bg-black/30 rounded-lg hover:bg-success/10 hover:border-success/30 border border-transparent transition-colors group"
                    onClick={() => setDomainInput(suggestion)}
                  >
                    <span className="font-mono text-sm text-white">{suggestion}.voucherverse.com</span>
                    <Check className="w-4 h-4 text-success opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Other Extensions */}
          <div className="bg-black/20 rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-3">Domain ekstensi lainnya:</p>
            <div className="space-y-2">
              {result.extensions.map((ext, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    ext.available 
                      ? 'bg-black/30 border border-white/5' 
                      : 'bg-black/20 opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {ext.available ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-mono text-sm text-white">{result.domain}{ext.ext}</span>
                    {ext.type === 'subdomain' && (
                      <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Gratis</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {ext.price && ext.available && (
                      <span className="font-mono text-sm text-muted-foreground">
                        {formatPrice(ext.price)}/tahun
                      </span>
                    )}
                    {ext.available && ext.type === 'domain' && (
                      <Button size="sm" variant="outline" className="text-xs h-7 border-border">
                        Beli
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tips */}
      {!result && (
        <div className="bg-black/20 rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-2">Tips memilih nama domain:</p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-success" />
              Gunakan nama yang mudah diingat
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-success" />
              Hindari angka dan tanda hubung berlebihan
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-success" />
              Pilih nama yang mencerminkan bisnis Anda
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default function Reseller() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState('yearly');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('legend');
  const [loading, setLoading] = useState(false);
  
  // Profit Calculator State
  const [sellingPrice, setSellingPrice] = useState(25000);
  const [dailySales, setDailySales] = useState(10);
  const basePrice = 19000; // Reseller price

  const calculateProfit = () => {
    const profitPerSale = sellingPrice - basePrice;
    const dailyProfit = profitPerSale * dailySales;
    const monthlyProfit = dailyProfit * 30;
    return { profitPerSale, dailyProfit, monthlyProfit };
  };

  const profit = calculateProfit();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Silakan login terlebih dahulu');
      navigate('/login');
      return;
    }

    if (!phone) {
      toast.error('Nomor telepon harus diisi');
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${API_URL}/api/reseller/apply`,
        { phone, business_name: businessName || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Pendaftaran reseller berhasil! Menunggu persetujuan admin.');
      navigate('/profile');
    } catch (error) {
      console.error('Failed to apply:', error);
      toast.error(error.response?.data?.detail || 'Gagal mendaftar reseller');
    } finally {
      setLoading(false);
    }
  };

  // Already a reseller
  if (user?.role === 'reseller') {
    return (
      <div className="min-h-screen pt-24 pb-12 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-success" />
          </div>
          <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">
            Anda Sudah Reseller!
          </h1>
          <p className="text-muted-foreground mb-6">
            Akses dashboard reseller untuk mengelola penjualan Anda
          </p>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => navigate('/reseller/dashboard')}
          >
            Buka Dashboard
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        
        <div className="relative max-w-6xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Program Reseller Terbaik 2026</span>
          </div>
          
          <h1 className="font-rajdhani font-bold text-4xl sm:text-5xl lg:text-6xl text-white uppercase mb-6">
            Mulai Bisnis Top Up Game <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent">
              Tanpa Ribet & Modal Besar
            </span>
          </h1>
          
          <p className="text-gray-300 text-lg md:text-xl max-w-3xl mx-auto mb-8">
            Bergabung dengan 2,500+ reseller sukses. Dapatkan website sendiri, harga spesial, 
            dan sistem otomatis 24 jam. Mulai dari <span className="text-primary font-bold">Rp 99.000/bulan</span>
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider px-8"
              onClick={() => document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' })}
              data-testid="cta-pricing"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Lihat Harga Paket
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-secondary/50 text-secondary hover:bg-secondary/10 font-rajdhani uppercase tracking-wider"
              onClick={() => document.getElementById('domain-checker').scrollIntoView({ behavior: 'smooth' })}
              data-testid="cta-domain"
            >
              <Globe className="w-5 h-5 mr-2" />
              Cek Domain
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 font-rajdhani uppercase tracking-wider"
              onClick={() => document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' })}
            >
              <Calculator className="w-5 h-5 mr-2" />
              Hitung Keuntungan
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {STATS.map((stat, index) => (
              <div key={index} className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="font-mono text-2xl md:text-3xl font-bold text-white">
                  {stat.value}<span className="text-primary">{stat.suffix}</span>
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-rajdhani font-bold text-3xl md:text-4xl text-white uppercase mb-4">
              Kenapa Pilih <span className="text-primary">VoucherVerse</span>?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Platform reseller all-in-one dengan fitur lengkap untuk memulai bisnis top up game
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {BENEFITS.map((benefit, index) => {
              const Icon = benefit.icon;
              const colorClass = {
                'primary': 'bg-primary/20 text-primary',
                'secondary': 'bg-secondary/20 text-secondary',
                'success': 'bg-success/20 text-success',
                'accent': 'bg-accent/20 text-accent',
                'destructive': 'bg-destructive/20 text-destructive',
              }[benefit.color];
              
              return (
                <div 
                  key={index} 
                  className="group bg-card rounded-2xl p-6 border border-white/5 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`w-14 h-14 rounded-xl ${colorClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-rajdhani font-semibold text-xl text-white mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground text-sm">{benefit.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Domain Checker Section */}
      <section id="domain-checker" className="py-16 md:py-24 bg-card/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="font-rajdhani font-bold text-3xl md:text-4xl text-white uppercase mb-4">
              Cek <span className="text-secondary">Domain</span> Impianmu
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Pilih nama domain unik untuk website reseller Anda. Subdomain gratis untuk semua paket!
            </p>
          </div>
          
          <DomainChecker />
        </div>
      </section>

      {/* Profit Calculator */}
      <section id="calculator" className="py-16 md:py-24 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-rajdhani font-bold text-3xl md:text-4xl text-white uppercase mb-4">
                <Calculator className="inline w-8 h-8 text-secondary mr-2" />
                Kalkulator Keuntungan
              </h2>
              <p className="text-muted-foreground mb-8">
                Hitung estimasi penghasilan Anda sebagai reseller VoucherVerse. 
                Geser slider untuk melihat potensi keuntungan!
              </p>

              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-gray-300">Harga Jual per Item</Label>
                    <span className="font-mono text-primary">{formatPrice(sellingPrice)}</span>
                  </div>
                  <input
                    type="range"
                    min="20000"
                    max="50000"
                    step="1000"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(Number(e.target.value))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Rp 20.000</span>
                    <span>Rp 50.000</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <Label className="text-gray-300">Penjualan per Hari</Label>
                    <span className="font-mono text-primary">{dailySales} transaksi</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={dailySales}
                    onChange={(e) => setDailySales(Number(e.target.value))}
                    className="w-full h-2 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1 transaksi</span>
                    <span>100 transaksi</span>
                  </div>
                </div>

                <div className="bg-black/30 rounded-xl p-4">
                  <p className="text-sm text-muted-foreground mb-1">Harga Modal (Reseller)</p>
                  <p className="font-mono text-lg text-white">{formatPrice(basePrice)}</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl p-8 border border-primary/30">
              <h3 className="font-rajdhani font-semibold text-xl text-white uppercase mb-6 text-center">
                Estimasi Penghasilan
              </h3>
              
              <div className="space-y-4">
                <div className="bg-black/30 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-gray-300">Profit per Transaksi</span>
                  <span className="font-mono text-xl font-bold text-success">
                    {formatPrice(profit.profitPerSale)}
                  </span>
                </div>
                <div className="bg-black/30 rounded-xl p-4 flex justify-between items-center">
                  <span className="text-gray-300">Profit per Hari</span>
                  <span className="font-mono text-xl font-bold text-secondary">
                    {formatPrice(profit.dailyProfit)}
                  </span>
                </div>
                <div className="bg-primary/20 rounded-xl p-6 border border-primary/30">
                  <p className="text-center text-gray-300 mb-2">Estimasi Profit per Bulan</p>
                  <p className="font-mono text-4xl font-bold text-center text-primary">
                    {formatPrice(profit.monthlyProfit)}
                  </p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                * Estimasi berdasarkan asumsi penjualan konsisten
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 md:py-24 border-t border-border">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-rajdhani font-bold text-3xl md:text-4xl text-white uppercase mb-4">
              Pilih Paket <span className="text-primary">Reseller</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Pilih paket yang sesuai dengan kebutuhan bisnis Anda
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-4 bg-card rounded-full p-1 border border-border">
              <button
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingPeriod === 'monthly' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
                }`}
                onClick={() => setBillingPeriod('monthly')}
              >
                Bulanan
              </button>
              <button
                className={`px-6 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  billingPeriod === 'yearly' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-white'
                }`}
                onClick={() => setBillingPeriod('yearly')}
              >
                Tahunan
                <span className="text-xs bg-success/20 text-success px-2 py-0.5 rounded-full">
                  Hemat 33%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PACKAGES.map((pkg) => {
              const Icon = pkg.icon;
              const price = billingPeriod === 'yearly' ? pkg.yearlyPrice : pkg.monthlyPrice;
              const isPopular = pkg.popular;
              
              return (
                <div 
                  key={pkg.id}
                  className={`relative bg-card rounded-2xl p-6 border transition-all duration-300 ${
                    isPopular 
                      ? 'border-primary shadow-[0_0_30px_rgba(124,58,237,0.3)] scale-105' 
                      : 'border-white/10 hover:border-primary/30'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-white text-xs font-bold px-4 py-1 rounded-full uppercase">
                        Paling Populer
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className={`w-16 h-16 rounded-2xl bg-${pkg.color}/20 flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 text-${pkg.color}`} />
                    </div>
                    <h3 className="font-rajdhani font-bold text-2xl text-white uppercase">{pkg.name}</h3>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="font-mono text-4xl font-bold text-white">
                        {formatPrice(price)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {billingPeriod === 'yearly' ? '/tahun' : '/bulan'}
                    </p>
                    {billingPeriod === 'yearly' && (
                      <p className="text-xs text-success mt-1">
                        Hemat {formatPrice(pkg.monthlyPrice * 12 - pkg.yearlyPrice)}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-6">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        {feature.included ? (
                          <Check className="w-4 h-4 text-success flex-shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={feature.included ? 'text-white' : 'text-muted-foreground'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className={`w-full font-rajdhani uppercase tracking-wider ${
                      isPopular 
                        ? 'bg-primary hover:bg-primary/90 text-white' 
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                    onClick={() => {
                      setSelectedPackage(pkg.id);
                      document.getElementById('register-form').scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Pilih {pkg.name}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-rajdhani font-bold text-3xl md:text-4xl text-white uppercase mb-4">
              Wall of Fame: <span className="text-accent">Reseller Sukses</span>
            </h2>
            <p className="text-muted-foreground">
              Cerita sukses dari reseller VoucherVerse
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, index) => (
              <div key={index} className="bg-card rounded-2xl p-6 border border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-bold text-primary">{testimonial.avatar}</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">{testimonial.name}</p>
                    <p className="text-xs text-muted-foreground">{testimonial.store}</p>
                  </div>
                </div>
                
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                  ))}
                </div>

                <p className="text-gray-300 text-sm mb-4">"{testimonial.comment}"</p>
                
                <div className="bg-success/10 rounded-lg p-3 border border-success/20">
                  <p className="text-xs text-muted-foreground">Penghasilan</p>
                  <p className="font-mono text-lg font-bold text-success">{testimonial.profit}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Registration Form */}
      <section id="register-form" className="py-16 md:py-24 border-t border-border">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-card rounded-2xl p-8 border border-border">
            <div className="text-center mb-6">
              <Gift className="w-12 h-12 text-primary mx-auto mb-4" />
              <h2 className="font-rajdhani font-bold text-2xl text-white uppercase">
                Daftar Sekarang
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                Paket terpilih: <span className="text-primary font-medium capitalize">{selectedPackage}</span>
              </p>
            </div>

            {!user ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Silakan login atau daftar terlebih dahulu
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    className="border-border text-white hover:bg-white/5"
                    onClick={() => navigate('/login')}
                  >
                    Masuk
                  </Button>
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white"
                    onClick={() => navigate('/register')}
                  >
                    Daftar
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">Nama</Label>
                  <Input
                    type="text"
                    value={user.name}
                    disabled
                    className="bg-black/30 border-white/10 text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Email</Label>
                  <Input
                    type="email"
                    value={user.email}
                    disabled
                    className="bg-black/30 border-white/10 text-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-300">Nomor WhatsApp *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08xxxxxxxxxx"
                    className="bg-black/50 border-white/10 text-white"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    data-testid="reseller-phone"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName" className="text-gray-300">Nama Toko/Usaha (Opsional)</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Nama toko Anda"
                    className="bg-black/50 border-white/10 text-white"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    data-testid="reseller-business"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider py-6"
                  disabled={loading}
                  data-testid="reseller-submit"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Mendaftar...
                    </span>
                  ) : (
                    <>
                      <Rocket className="w-5 h-5 mr-2" />
                      Daftar Reseller
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span>Garansi uang kembali 7 hari</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-card/50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-rajdhani font-bold text-3xl text-white uppercase mb-4">
              Pertanyaan Umum
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'Apakah perlu deposit untuk menjadi reseller?',
                a: 'Tidak perlu deposit! Anda hanya perlu membayar biaya paket reseller sesuai pilihan Anda.'
              },
              {
                q: 'Berapa lama proses aktivasi akun reseller?',
                a: 'Proses aktivasi biasanya dilakukan dalam 1x24 jam setelah pembayaran dikonfirmasi.'
              },
              {
                q: 'Bagaimana cara menarik keuntungan?',
                a: 'Keuntungan dapat ditarik kapan saja ke rekening bank Anda. Proses pencairan maksimal 1x24 jam kerja.'
              },
              {
                q: 'Apakah ada garansi uang kembali?',
                a: 'Ya! Kami memberikan garansi uang kembali 100% dalam 7 hari pertama jika Anda tidak puas.'
              },
            ].map((faq, index) => (
              <div key={index} className="bg-card rounded-xl p-6 border border-white/10">
                <h3 className="font-medium text-white mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
