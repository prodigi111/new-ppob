import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';
import { 
  ChevronLeft, 
  Zap, 
  AlertCircle,
  Wallet,
  CreditCard,
  QrCode,
  Building2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PAYMENT_METHODS = [
  { id: 'qris', name: 'QRIS', icon: QrCode, description: 'GoPay, OVO, Dana, dll' },
  { id: 'va_bca', name: 'Virtual Account BCA', icon: Building2, description: 'Transfer via BCA' },
  { id: 'va_bni', name: 'Virtual Account BNI', icon: Building2, description: 'Transfer via BNI' },
  { id: 'va_mandiri', name: 'Virtual Account Mandiri', icon: Building2, description: 'Transfer via Mandiri' },
];

export default function ProductDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDenom, setSelectedDenom] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [userId, setUserId] = useState('');
  const [serverId, setServerId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/products/${slug}`);
      setProduct(response.data.product);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Produk tidak ditemukan');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const getPrice = (denom) => {
    if (user?.role === 'reseller') {
      return denom.reseller_price;
    }
    return denom.price;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDenom) {
      toast.error('Pilih nominal terlebih dahulu');
      return;
    }

    if (!selectedPayment) {
      toast.error('Pilih metode pembayaran');
      return;
    }

    if (product.input_fields.includes('user_id') && !userId) {
      toast.error('Masukkan User ID');
      return;
    }

    if (product.input_fields.includes('server_id') && !serverId) {
      toast.error('Masukkan Server ID');
      return;
    }

    if (!email) {
      toast.error('Masukkan email');
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        product_id: product.id,
        denomination_id: selectedDenom.id,
        game_user_id: userId,
        game_server_id: serverId || null,
        email: email,
        payment_method: selectedPayment.id
      };

      const endpoint = user 
        ? `${API_URL}/api/orders/authenticated`
        : `${API_URL}/api/orders/guest`;

      const headers = user 
        ? { Authorization: `Bearer ${token}` }
        : {};

      const response = await axios.post(endpoint, orderData, { headers });
      const order = response.data.order;

      toast.success('Order berhasil dibuat!');
      navigate(`/checkout/${order.id}`, { state: { order } });
    } catch (error) {
      console.error('Failed to create order:', error);
      toast.error(error.response?.data?.detail || 'Gagal membuat order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <div className="min-h-screen pt-16">
      {/* Banner */}
      <div className="relative h-48 md:h-64 overflow-hidden">
        <img
          src={product.banner_image || product.image}
          alt={product.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white mb-4"
            onClick={() => navigate('/')}
            data-testid="back-btn"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Kembali
          </Button>
          <div className="flex items-center gap-4">
            <img
              src={product.image}
              alt={product.name}
              className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border-2 border-white/20"
            />
            <div>
              <h1 className="font-rajdhani font-bold text-2xl md:text-3xl text-white uppercase">
                {product.name}
              </h1>
              <p className="text-muted-foreground text-sm capitalize">{product.category}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left - Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Instructions */}
            {product.instructions && (
              <div className="bg-card rounded-xl p-4 border border-border">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-300">{product.instructions}</p>
                </div>
              </div>
            )}

            {/* ID Input */}
            {product.input_fields.length > 0 && (
              <div className="bg-card rounded-xl p-6 border border-border">
                <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
                  1. Masukkan Data Akun
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {product.input_fields.includes('user_id') && (
                    <div className="space-y-2">
                      <Label htmlFor="userId" className="text-gray-300">User ID</Label>
                      <Input
                        id="userId"
                        type="text"
                        placeholder="Masukkan User ID"
                        className="bg-black/50 border-white/10 text-white font-mono"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        data-testid="user-id-input"
                      />
                    </div>
                  )}
                  {product.input_fields.includes('server_id') && (
                    <div className="space-y-2">
                      <Label htmlFor="serverId" className="text-gray-300">Server ID / Zone ID</Label>
                      <Input
                        id="serverId"
                        type="text"
                        placeholder="Masukkan Server ID"
                        className="bg-black/50 border-white/10 text-white font-mono"
                        value={serverId}
                        onChange={(e) => setServerId(e.target.value)}
                        data-testid="server-id-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Denominations */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
                {product.input_fields.length > 0 ? '2.' : '1.'} Pilih Nominal
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {product.denominations.map((denom) => (
                  <button
                    key={denom.id}
                    className={`denom-card p-4 rounded-xl text-left ${
                      selectedDenom?.id === denom.id ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedDenom(denom)}
                    data-testid={`denom-${denom.id}`}
                  >
                    <p className="font-rajdhani font-semibold text-white">{denom.name}</p>
                    <p className="font-mono text-sm text-primary mt-1">
                      {formatPrice(getPrice(denom))}
                    </p>
                    {user?.role === 'reseller' && denom.price !== denom.reseller_price && (
                      <p className="text-xs text-muted-foreground line-through">
                        {formatPrice(denom.price)}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
                {product.input_fields.length > 0 ? '3.' : '2.'} Pilih Pembayaran
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      className={`payment-card p-4 rounded-xl flex items-center gap-3 ${
                        selectedPayment?.id === method.id ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedPayment(method)}
                      data-testid={`payment-${method.id}`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-secondary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white text-sm">{method.name}</p>
                        <p className="text-xs text-muted-foreground">{method.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
                {product.input_fields.length > 0 ? '4.' : '3.'} Email Konfirmasi
              </h2>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-300">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email"
                  className="bg-black/50 border-white/10 text-white"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="email-input"
                />
                <p className="text-xs text-muted-foreground">
                  Bukti transaksi akan dikirim ke email ini
                </p>
              </div>
            </div>
          </div>

          {/* Right - Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">
                Ringkasan Pesanan
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div>
                    <p className="font-medium text-white">{product.name}</p>
                    {selectedDenom && (
                      <p className="text-sm text-primary">{selectedDenom.name}</p>
                    )}
                  </div>
                </div>

                {(userId || serverId) && (
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-sm">
                    {userId && (
                      <p className="text-gray-300">
                        User ID: <span className="text-white">{userId}</span>
                      </p>
                    )}
                    {serverId && (
                      <p className="text-gray-300">
                        Server ID: <span className="text-white">{serverId}</span>
                      </p>
                    )}
                  </div>
                )}

                {selectedPayment && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Wallet className="w-4 h-4" />
                    {selectedPayment.name}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Total Pembayaran</span>
                  <span className="font-mono text-xl font-bold text-white">
                    {selectedDenom ? formatPrice(getPrice(selectedDenom)) : 'Rp 0'}
                  </span>
                </div>
              </div>

              <Button
                className="w-full bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider py-6"
                onClick={handleSubmit}
                disabled={submitting || !selectedDenom || !selectedPayment}
                data-testid="order-btn"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Beli Sekarang
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
