import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  Package
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  useEffect(() => {
    if (!user || (user.role !== 'reseller' && user.role !== 'admin')) {
      navigate('/');
      return;
    }
    fetchDashboard();
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
                <Clock className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs text-muted-foreground">{completedOrders} selesai</span>
            </div>
            <p className="font-mono text-2xl md:text-3xl font-bold text-white">
              {dashboard?.pending_orders || 0}
            </p>
            <p className="text-sm text-muted-foreground mt-1">Pending</p>
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
            <TabsTrigger value="website" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Globe className="w-4 h-4 mr-2" />
              Website
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
                    onClick={() => setActiveTab('website')}
                  >
                    <Globe className="w-4 h-4 mr-3 text-secondary" />
                    Kelola Website
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

          {/* Website Tab */}
          <TabsContent value="website">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase mb-6">
                  Website Anda
                </h3>
                <div className="space-y-4">
                  <div className="bg-black/20 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">URL Website</p>
                    <div className="flex items-center gap-2">
                      <Input 
                        value={`https://${user?.name?.toLowerCase().replace(/\s/g, '')}.voucherverse.com`}
                        readOnly
                        className="bg-transparent border-0 text-white font-mono p-0"
                      />
                      <Button size="icon" variant="ghost" onClick={() => copyToClipboard(`https://${user?.name?.toLowerCase().replace(/\s/g, '')}.voucherverse.com`)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Pengunjung Hari Ini</p>
                      <p className="font-mono text-2xl text-white">127</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-4">
                      <p className="text-xs text-muted-foreground mb-1">Total Pengunjung</p>
                      <p className="font-mono text-2xl text-white">3,842</p>
                    </div>
                  </div>

                  <Button className="w-full bg-white/10 hover:bg-white/20 text-white">
                    <Settings className="w-4 h-4 mr-2" />
                    Kustomisasi Website
                  </Button>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-6 border border-border">
                <h3 className="font-rajdhani font-semibold text-lg text-white uppercase mb-6">
                  Custom Domain
                </h3>
                <div className="text-center py-8">
                  <Globe className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Upgrade ke Paket Legend</p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Dapatkan custom domain sendiri untuk website Anda
                  </p>
                  <Button className="bg-primary hover:bg-primary/90 text-white">
                    Upgrade Sekarang
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
