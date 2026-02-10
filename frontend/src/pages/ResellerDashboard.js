import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { formatPrice, formatDate, getStatusColor, getStatusText } from '../lib/utils';
import { toast } from 'sonner';
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  Clock,
  Plus,
  ArrowUpRight,
  Globe,
  Settings,
  BarChart3,
  CreditCard,
  Users,
  Gift,
  Copy,
  ExternalLink,
  RefreshCw,
  Download,
  Calendar,
  DollarSign,
  Package,
  Rocket,
  Palette,
  Image,
  Type,
  CheckCircle2,
  Loader2,
  Eye,
  Smartphone,
  Monitor,
  Zap,
  Upload,
  Store,
  Sparkles
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Theme options for website
const THEMES = [
  { id: 'neon', name: 'Neon Cyber', primary: '#7C3AED', secondary: '#00E5FF', bg: '#050505' },
  { id: 'sunset', name: 'Sunset Blaze', primary: '#F97316', secondary: '#FACC15', bg: '#0A0A0A' },
  { id: 'ocean', name: 'Ocean Wave', primary: '#0EA5E9', secondary: '#06B6D4', bg: '#0C1222' },
  { id: 'forest', name: 'Forest Green', primary: '#22C55E', secondary: '#84CC16', bg: '#0A1A0A' },
  { id: 'rose', name: 'Rose Gold', primary: '#EC4899', secondary: '#F472B6', bg: '#1A0A14' },
  { id: 'classic', name: 'Classic Dark', primary: '#6366F1', secondary: '#8B5CF6', bg: '#111111' },
];

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  // Website Deploy States
  const [websiteSetup, setWebsiteSetup] = useState({
    storeName: '',
    customDomain: '',
    domainExtension: '.com',
    tagline: 'Top Up Game Murah & Cepat',
    whatsapp: '',
    theme: 'neon',
    logo: null,
    deployed: false,
    deploying: false,
    deployedAt: null,
    dnsConfigured: false,
  });
  const [setupStep, setSetupStep] = useState(1);
  const [previewDevice, setPreviewDevice] = useState('desktop');

  useEffect(() => {
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      navigate('/');
      return;
    }
    fetchDashboard();
    // Load saved website config
    const savedConfig = localStorage.getItem(`website_config_${user.id}`);
    if (savedConfig) {
      setWebsiteSetup(JSON.parse(savedConfig));
    } else {
      setWebsiteSetup(prev => ({
        ...prev,
        storeName: `${user.name}'s Store`,
        customDomain: user.name.toLowerCase().replace(/\s+/g, ''),
      }));
    }
  }, [user, navigate]);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reseller/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
      toast.error('Gagal memuat dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount <= 0) {
      toast.error('Masukkan jumlah yang valid');
      return;
    }

    setTopupLoading(true);
    try {
      const response = await axios.post(
        `${API_URL}/api/reseller/topup`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDashboard({ ...dashboard, balance: response.data.balance });
      updateUser({ ...user, balance: response.data.balance });
      toast.success(`Berhasil menambah saldo ${formatPrice(amount)}`);
      setTopupAmount('');
    } catch (error) {
      console.error('Failed to topup:', error);
      toast.error('Gagal top up saldo');
    } finally {
      setTopupLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Berhasil disalin!');
  };

  const handleDeployWebsite = async () => {
    if (!websiteSetup.storeName || !websiteSetup.customDomain) {
      toast.error('Lengkapi nama toko dan domain');
      return;
    }

    setWebsiteSetup(prev => ({ ...prev, deploying: true }));
    
    // Simulate deployment process
    await new Promise(resolve => setTimeout(resolve, 3000));

    const newConfig = {
      ...websiteSetup,
      deployed: true,
      deploying: false,
      deployedAt: new Date().toISOString(),
    };
    
    setWebsiteSetup(newConfig);
    localStorage.setItem(`website_config_${user.id}`, JSON.stringify(newConfig));
    toast.success('Website berhasil di-deploy! 🚀');
  };

  const handleSaveConfig = () => {
    localStorage.setItem(`website_config_${user.id}`, JSON.stringify(websiteSetup));
    toast.success('Konfigurasi tersimpan');
  };

  const selectedTheme = THEMES.find(t => t.id === websiteSetup.theme) || THEMES[0];

  if (!user || (user.role !== 'reseller' && user.role !== 'admin')) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Calculate metrics
  const todayOrders = dashboard?.recent_orders?.filter(o => {
    const today = new Date().toDateString();
    return new Date(o.created_at).toDateString() === today;
  }).length || 0;

  const completedOrders = dashboard?.recent_orders?.filter(o => o.status === 'completed').length || 0;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-rajdhani font-bold text-2xl md:text-3xl text-white uppercase">
              Dashboard Reseller
            </h1>
            <p className="text-muted-foreground">Selamat datang kembali, {user.name}!</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-border text-white hover:bg-white/5"
              onClick={fetchDashboard}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => navigate('/')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Order Baru
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-6 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">Saldo</span>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold text-white">
              {formatPrice(dashboard?.balance || 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Saldo Tersedia</p>
          </div>

          <div className="bg-gradient-to-br from-success/20 to-success/5 rounded-2xl p-6 border border-success/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-success" />
              </div>
              <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +15%
              </span>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold text-white">
              {formatPrice(dashboard?.total_sales || 0)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Penjualan</p>
          </div>

          <div className="bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-2xl p-6 border border-secondary/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-secondary" />
              </div>
              <span className="text-xs text-muted-foreground">{todayOrders} hari ini</span>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold text-white">
              {dashboard?.total_orders || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Total Transaksi</p>
          </div>

          <div className="bg-gradient-to-br from-accent/20 to-accent/5 rounded-2xl p-6 border border-accent/20">
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                <Globe className="w-6 h-6 text-accent" />
              </div>
              {websiteSetup.deployed ? (
                <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">Online</span>
              ) : (
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Offline</span>
              )}
            </div>
            <p className="font-mono text-lg font-bold text-white truncate">
              {websiteSetup.customDomain || 'belum-setup'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">{websiteSetup.domainExtension || '.com'}</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Transaksi
            </TabsTrigger>
            <TabsTrigger value="topup" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <CreditCard className="w-4 h-4 mr-2" />
              Top Up Saldo
            </TabsTrigger>
            <TabsTrigger value="deploy" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Rocket className="w-4 h-4 mr-2" />
              Deploy Website
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Chart placeholder */}
              <div className="lg:col-span-2 bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-rajdhani font-semibold text-lg text-white uppercase">
                    Statistik Penjualan
                  </h3>
                  <select className="bg-black/30 border border-border rounded-lg px-3 py-1 text-sm text-white">
                    <option>7 Hari Terakhir</option>
                    <option>30 Hari Terakhir</option>
                    <option>Bulan Ini</option>
                  </select>
                </div>
                <div className="h-64 flex items-center justify-center bg-black/20 rounded-xl">
                  <div className="text-center">
                    <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">Grafik penjualan akan ditampilkan di sini</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
                  Aksi Cepat
                </h3>
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start bg-white/5 hover:bg-white/10 text-white"
                    onClick={() => navigate('/')}
                  >
                    <Plus className="w-4 h-4 mr-3 text-primary" />
                    Buat Order Baru
                  </Button>
                  <Button 
                    className="w-full justify-start bg-white/5 hover:bg-white/10 text-white"
                    onClick={() => setActiveTab('topup')}
                  >
                    <Wallet className="w-4 h-4 mr-3 text-success" />
                    Top Up Saldo
                  </Button>
                  <Button 
                    className="w-full justify-start bg-white/5 hover:bg-white/10 text-white"
                    onClick={() => setActiveTab('deploy')}
                  >
                    <Rocket className="w-4 h-4 mr-3 text-secondary" />
                    {websiteSetup.deployed ? 'Kelola Website' : 'Deploy Website'}
                  </Button>
                  <Button 
                    className="w-full justify-start bg-white/5 hover:bg-white/10 text-white"
                  >
                    <Gift className="w-4 h-4 mr-3 text-accent" />
                    Buat Kupon
                  </Button>
                </div>

                {/* Referral Link */}
                <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-2">Link Referral Anda</p>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={`https://voucherverse.com/ref/${user?.id?.slice(0, 8)}`}
                      readOnly
                      className="bg-black/30 border-white/10 text-white text-xs"
                    />
                    <Button 
                      size="icon"
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => copyToClipboard(`https://voucherverse.com/ref/${user?.id?.slice(0, 8)}`)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Transaksi Terbaru
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-primary"
                  onClick={() => setActiveTab('orders')}
                >
                  Lihat Semua
                  <ArrowUpRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
              {dashboard?.recent_orders?.length > 0 ? (
                <div className="divide-y divide-border">
                  {dashboard.recent_orders.slice(0, 5).map((order) => (
                    <div key={order.id} className="p-4 hover:bg-white/5 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-white">{order.product_name}</p>
                          <p className="text-sm text-muted-foreground">{order.denomination_name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-primary font-medium">{formatPrice(order.price)}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(order.status)}`}>
                          {getStatusText(order.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Belum ada transaksi</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Riwayat Transaksi
                </h3>
                <div className="flex items-center gap-3">
                  <Input 
                    placeholder="Cari order..." 
                    className="w-48 bg-black/30 border-border"
                  />
                  <Button variant="outline" className="border-border">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Order</TableHead>
                      <TableHead className="text-muted-foreground">Produk</TableHead>
                      <TableHead className="text-muted-foreground">User ID</TableHead>
                      <TableHead className="text-muted-foreground">Total</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Tanggal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard?.recent_orders?.map((order) => (
                      <TableRow key={order.id} className="border-border">
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white">{order.product_name}</p>
                            <p className="text-xs text-muted-foreground">{order.denomination_name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{order.game_user_id}</TableCell>
                        <TableCell className="font-mono text-primary">{formatPrice(order.price)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Top Up Tab */}
          <TabsContent value="topup">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase mb-6">
                  Top Up Saldo
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Jumlah Top Up</label>
                    <Input
                      type="number"
                      placeholder="Masukkan jumlah"
                      className="bg-black/50 border-white/10 text-white font-mono text-lg"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      data-testid="topup-amount"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {[100000, 250000, 500000, 1000000].map((amount) => (
                      <Button
                        key={amount}
                        variant="outline"
                        size="sm"
                        className="border-border text-white hover:bg-white/5 font-mono"
                        onClick={() => setTopupAmount(amount.toString())}
                      >
                        {formatPrice(amount)}
                      </Button>
                    ))}
                  </div>

                  <div className="bg-black/20 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Saldo Saat Ini</span>
                      <span className="font-mono text-white">{formatPrice(dashboard?.balance || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-muted-foreground">Top Up</span>
                      <span className="font-mono text-success">+{formatPrice(parseFloat(topupAmount) || 0)}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white font-medium">Saldo Akhir</span>
                        <span className="font-mono text-lg text-primary font-bold">
                          {formatPrice((dashboard?.balance || 0) + (parseFloat(topupAmount) || 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full bg-success hover:bg-success/90 text-black font-rajdhani uppercase py-6"
                    onClick={handleTopup}
                    disabled={topupLoading}
                    data-testid="topup-submit"
                  >
                    {topupLoading ? 'Memproses...' : 'Top Up Saldo (Demo)'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    * Ini adalah simulasi untuk demo
                  </p>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase mb-6">
                  Riwayat Top Up
                </h3>
                <div className="space-y-3">
                  {[
                    { date: '10 Feb 2026', amount: 500000, status: 'success' },
                    { date: '8 Feb 2026', amount: 250000, status: 'success' },
                    { date: '5 Feb 2026', amount: 1000000, status: 'success' },
                  ].map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-mono text-white">+{formatPrice(item.amount)}</p>
                          <p className="text-xs text-muted-foreground">{item.date}</p>
                        </div>
                      </div>
                      <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">Berhasil</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Deploy Website Tab */}
          <TabsContent value="deploy" className="space-y-6">
            {/* Status Banner */}
            {websiteSetup.deployed && (
              <div className="bg-success/10 border border-success/30 rounded-2xl p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h3 className="font-rajdhani font-semibold text-lg text-white">Website Online!</h3>
                      <p className="text-sm text-white font-mono">
                        {websiteSetup.customDomain}{websiteSetup.domainExtension}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Deployed pada {formatDate(websiteSetup.deployedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="border-success/30 text-success hover:bg-success/10"
                      onClick={() => window.open(`https://${websiteSetup.customDomain}${websiteSetup.domainExtension}`, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Buka Website
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border"
                      onClick={() => copyToClipboard(`https://${websiteSetup.customDomain}${websiteSetup.domainExtension}`)}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Salin URL
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Configuration */}
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-rajdhani font-semibold text-lg text-white uppercase">
                      Konfigurasi Website
                    </h3>
                    <p className="text-sm text-muted-foreground">Sesuaikan tampilan toko Anda</p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Store Name */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Store className="w-4 h-4" />
                      Nama Toko
                    </Label>
                    <Input
                      placeholder="Nama toko Anda"
                      className="bg-black/50 border-white/10 text-white"
                      value={websiteSetup.storeName}
                      onChange={(e) => setWebsiteSetup(prev => ({ ...prev, storeName: e.target.value }))}
                    />
                  </div>

                  {/* Custom Domain */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Domain Website
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="namatoko"
                        className="bg-black/50 border-white/10 text-white flex-1"
                        value={websiteSetup.customDomain}
                        onChange={(e) => setWebsiteSetup(prev => ({ 
                          ...prev, 
                          customDomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                        }))}
                      />
                      <select
                        className="bg-black/50 border border-white/10 rounded-lg px-3 text-white font-mono"
                        value={websiteSetup.domainExtension}
                        onChange={(e) => setWebsiteSetup(prev => ({ ...prev, domainExtension: e.target.value }))}
                      >
                        <option value=".com">.com</option>
                        <option value=".id">.id</option>
                        <option value=".co.id">.co.id</option>
                        <option value=".net">.net</option>
                        <option value=".store">.store</option>
                      </select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Domain: <span className="font-mono text-primary">{websiteSetup.customDomain || 'namatoko'}{websiteSetup.domainExtension}</span>
                    </p>
                  </div>

                  {/* DNS Configuration Info */}
                  {!websiteSetup.deployed && (
                    <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <Globe className="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-white font-medium mb-1">Setup DNS (Setelah Deploy)</p>
                          <p className="text-xs text-muted-foreground mb-2">
                            Setelah deploy, arahkan domain Anda ke server kami dengan menambahkan DNS record berikut:
                          </p>
                          <div className="bg-black/30 rounded-lg p-2 font-mono text-xs">
                            <p className="text-gray-300">A Record: @ → 185.199.108.153</p>
                            <p className="text-gray-300">CNAME: www → hosting.voucherverse.com</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tagline */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Type className="w-4 h-4" />
                      Tagline
                    </Label>
                    <Input
                      placeholder="Slogan toko Anda"
                      className="bg-black/50 border-white/10 text-white"
                      value={websiteSetup.tagline}
                      onChange={(e) => setWebsiteSetup(prev => ({ ...prev, tagline: e.target.value }))}
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Smartphone className="w-4 h-4" />
                      WhatsApp Support
                    </Label>
                    <Input
                      placeholder="08xxxxxxxxxx"
                      className="bg-black/50 border-white/10 text-white"
                      value={websiteSetup.whatsapp}
                      onChange={(e) => setWebsiteSetup(prev => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>

                  {/* Theme Selection */}
                  <div className="space-y-2">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Tema Website
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          className={`p-3 rounded-xl border transition-all ${
                            websiteSetup.theme === theme.id 
                              ? 'border-primary bg-primary/10' 
                              : 'border-white/10 hover:border-white/30'
                          }`}
                          onClick={() => setWebsiteSetup(prev => ({ ...prev, theme: theme.id }))}
                        >
                          <div className="flex gap-1 mb-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: theme.primary }}
                            />
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: theme.secondary }}
                            />
                          </div>
                          <p className="text-xs text-white text-left">{theme.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1 border-border"
                      onClick={handleSaveConfig}
                    >
                      Simpan Draft
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-white"
                      onClick={handleDeployWebsite}
                      disabled={websiteSetup.deploying}
                    >
                      {websiteSetup.deploying ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deploying...
                        </>
                      ) : websiteSetup.deployed ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Update Website
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          Deploy Website
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-card rounded-2xl p-6 border border-border">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                      <Eye className="w-5 h-5 text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-rajdhani font-semibold text-lg text-white uppercase">
                        Preview Website
                      </h3>
                      <p className="text-sm text-muted-foreground">Lihat tampilan website Anda</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-black/30 rounded-lg p-1">
                    <button
                      className={`p-2 rounded ${previewDevice === 'desktop' ? 'bg-white/10' : ''}`}
                      onClick={() => setPreviewDevice('desktop')}
                    >
                      <Monitor className="w-4 h-4 text-white" />
                    </button>
                    <button
                      className={`p-2 rounded ${previewDevice === 'mobile' ? 'bg-white/10' : ''}`}
                      onClick={() => setPreviewDevice('mobile')}
                    >
                      <Smartphone className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {/* Preview Frame */}
                <div 
                  className={`rounded-xl overflow-hidden border-4 border-white/10 transition-all mx-auto ${
                    previewDevice === 'mobile' ? 'w-[280px]' : 'w-full'
                  }`}
                  style={{ backgroundColor: selectedTheme.bg }}
                >
                  {/* Preview Header */}
                  <div 
                    className="p-4 border-b border-white/10"
                    style={{ backgroundColor: `${selectedTheme.primary}10` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: selectedTheme.primary }}
                        >
                          <Zap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-bold text-white text-sm">
                          {websiteSetup.storeName || 'Nama Toko'}
                        </span>
                      </div>
                      {previewDevice === 'desktop' && (
                        <div className="flex items-center gap-4 text-xs text-white/70">
                          <span>Home</span>
                          <span>Produk</span>
                          <span>Cek Transaksi</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Preview Hero */}
                  <div className="p-6 text-center">
                    <h2 
                      className="font-bold text-lg mb-2"
                      style={{ color: selectedTheme.primary }}
                    >
                      {websiteSetup.storeName || 'Nama Toko'}
                    </h2>
                    <p className="text-white/70 text-xs mb-4">
                      {websiteSetup.tagline}
                    </p>
                    <div 
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs"
                      style={{ backgroundColor: `${selectedTheme.secondary}20`, color: selectedTheme.secondary }}
                    >
                      <Sparkles className="w-3 h-3" />
                      Proses Instant 24 Jam
                    </div>
                  </div>

                  {/* Preview Products */}
                  <div className="p-4">
                    <p className="text-white/50 text-xs mb-3 uppercase tracking-wider">Produk Populer</p>
                    <div className={`grid gap-2 ${previewDevice === 'mobile' ? 'grid-cols-2' : 'grid-cols-4'}`}>
                      {['ML', 'FF', 'PUBG', 'GI'].map((game) => (
                        <div 
                          key={game}
                          className="p-3 rounded-lg border border-white/10 text-center"
                          style={{ backgroundColor: `${selectedTheme.primary}10` }}
                        >
                          <div 
                            className="w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center text-xs font-bold"
                            style={{ backgroundColor: selectedTheme.primary, color: 'white' }}
                          >
                            {game}
                          </div>
                          <p className="text-white/70 text-xs">{game}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview Footer */}
                  <div className="p-4 border-t border-white/10">
                    <p className="text-white/30 text-xs text-center">
                      © 2026 {websiteSetup.storeName || 'Nama Toko'}
                    </p>
                  </div>
                </div>

                {/* Preview URL */}
                <div className="mt-4 p-3 bg-black/20 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-mono text-white">
                      {websiteSetup.customDomain || 'namatoko'}{websiteSetup.domainExtension}
                    </span>
                  </div>
                  {websiteSetup.deployed && (
                    <span className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Live
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Features Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card rounded-xl p-4 border border-border flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Instant Deploy</h4>
                  <p className="text-xs text-muted-foreground">Website langsung online dalam hitungan detik</p>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-secondary" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Custom Domain</h4>
                  <p className="text-xs text-muted-foreground">Domain sendiri (.com, .id, .store) dengan SSL gratis</p>
                </div>
              </div>
              <div className="bg-card rounded-xl p-4 border border-border flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-5 h-5 text-success" />
                </div>
                <div>
                  <h4 className="font-medium text-white mb-1">Auto Sync</h4>
                  <p className="text-xs text-muted-foreground">Produk & harga sinkron otomatis dengan VoucherVerse</p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
