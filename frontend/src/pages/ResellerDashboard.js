import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { formatPrice, formatDate, getStatusColor, getStatusText } from '../lib/utils';
import { toast } from 'sonner';
import {
  Wallet,
  TrendingUp,
  ShoppingBag,
  Clock,
  Plus,
  ArrowUpRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const { user, token, updateUser } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
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

  if (!user || (user.role !== 'reseller' && user.role !== 'admin')) return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-rajdhani font-bold text-2xl text-white uppercase">
              Dashboard Reseller
            </h1>
            <p className="text-muted-foreground">Selamat datang, {user.name}</p>
          </div>
          <Button
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={() => navigate('/')}
          >
            <Plus className="w-4 h-4 mr-2" />
            Top Up Baru
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <span className="text-muted-foreground text-sm">Saldo</span>
            </div>
            <p className="font-mono text-2xl font-bold text-white">
              {formatPrice(dashboard?.balance || 0)}
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-success" />
              </div>
              <span className="text-muted-foreground text-sm">Total Penjualan</span>
            </div>
            <p className="font-mono text-2xl font-bold text-white">
              {formatPrice(dashboard?.total_sales || 0)}
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-secondary" />
              </div>
              <span className="text-muted-foreground text-sm">Total Order</span>
            </div>
            <p className="font-mono text-2xl font-bold text-white">
              {dashboard?.total_orders || 0}
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <span className="text-muted-foreground text-sm">Pending</span>
            </div>
            <p className="font-mono text-2xl font-bold text-white">
              {dashboard?.pending_orders || 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Top Up Balance */}
          <div className="bg-card rounded-xl p-6 border border-border">
            <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
              Top Up Saldo
            </h2>
            <div className="space-y-4">
              <div>
                <Input
                  type="number"
                  placeholder="Jumlah top up"
                  className="bg-black/50 border-white/10 text-white font-mono"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  data-testid="topup-amount"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {[100000, 500000, 1000000].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    className="border-border text-white hover:bg-white/5 font-mono text-xs"
                    onClick={() => setTopupAmount(amount.toString())}
                  >
                    {formatPrice(amount)}
                  </Button>
                ))}
              </div>
              <Button
                className="w-full bg-success hover:bg-success/90 text-black font-rajdhani uppercase"
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

          {/* Recent Orders */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                Transaksi Terbaru
              </h2>
            </div>
            {dashboard?.recent_orders?.length > 0 ? (
              <div className="divide-y divide-border">
                {dashboard.recent_orders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-white/5 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-white">{order.product_name}</p>
                        <p className="text-sm text-muted-foreground">{order.denomination_name}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground font-mono">{order.order_number}</span>
                      <span className="font-mono text-primary">{formatPrice(order.price)}</span>
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
        </div>
      </div>
    </div>
  );
}
