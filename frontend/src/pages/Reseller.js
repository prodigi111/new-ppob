import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { 
  Users, 
  Zap, 
  TrendingUp, 
  BadgePercent,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const BENEFITS = [
  { icon: BadgePercent, title: 'Harga Spesial', description: 'Dapatkan diskon hingga 5% untuk semua produk' },
  { icon: TrendingUp, title: 'Dashboard Reseller', description: 'Kelola penjualan dan monitor keuntungan' },
  { icon: Zap, title: 'Proses Cepat', description: 'Top up instant untuk pelanggan Anda' },
  { icon: Users, title: 'Support Prioritas', description: 'Layanan customer service prioritas 24/7' },
];

export default function Reseller() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="font-rajdhani font-bold text-4xl md:text-5xl text-white uppercase mb-4">
            Jadi Reseller <span className="text-primary">VoucherVerse</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Tingkatkan penghasilan dengan menjadi reseller. Dapatkan harga spesial dan akses ke dashboard reseller eksklusif.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-rajdhani font-semibold text-white mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.description}</p>
              </div>
            );
          })}
        </div>

        {/* Registration Form */}
        <div className="max-w-md mx-auto">
          <div className="bg-card rounded-xl p-8 border border-border">
            <h2 className="font-rajdhani font-bold text-xl text-white uppercase text-center mb-6">
              Daftar Reseller
            </h2>

            {!user ? (
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  Silakan login atau daftar terlebih dahulu untuk menjadi reseller
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
                  <Label htmlFor="businessName" className="text-gray-300">Nama Usaha (Opsional)</Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Nama toko/usaha Anda"
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
                    'Daftar Reseller'
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Dengan mendaftar, Anda menyetujui syarat dan ketentuan program reseller
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
