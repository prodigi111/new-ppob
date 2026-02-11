import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Zap,
  AlertCircle,
  QrCode,
  Building2,
  Loader2,
  Copy,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PAYMENT_METHODS = [
  { id: 'qris', name: 'QRIS', icon: QrCode, desc: 'GoPay, OVO, Dana, dll' },
  { id: 'va_bni', name: 'VA BNI', icon: Building2, desc: 'Transfer via BNI', channel: 'bni' },
  { id: 'va_bri', name: 'VA BRI', icon: Building2, desc: 'Transfer via BRI', channel: 'bri' },
  { id: 'va_mandiri', name: 'VA Mandiri', icon: Building2, desc: 'Transfer via Mandiri', channel: 'mandiri' },
];

const BANK_INFO = {
  bni: { name: 'BNI', color: '#f15a22' },
  bri: { name: 'BRI', color: '#00529c' },
  mandiri: { name: 'Mandiri', color: '#003366' },
};

export default function DigiFlazzProduct() {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [userId, setUserId] = useState('');
  const [serverId, setServerId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);

  // Payment state
  const [paymentData, setPaymentData] = useState(null);
  const [paymentStep, setPaymentStep] = useState('form'); // form | paying | done

  useEffect(() => {
    fetchBrand();
  }, [brandSlug]);

  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);

  const fetchBrand = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/biller/catalog/${brandSlug}`);
      setBrand(res.data);
      setProducts(res.data.products || []);
    } catch {
      toast.error('Produk tidak ditemukan');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSku) return toast.error('Pilih item terlebih dahulu');
    if (!selectedPayment) return toast.error('Pilih metode pembayaran');
    if (!userId) return toast.error('Masukkan User ID');
    if (!email) return toast.error('Masukkan email');

    setSubmitting(true);
    try {
      // 1. Create order in DB
      const orderData = {
        product_id: `df-${brandSlug}`,
        denomination_id: selectedSku.sku,
        game_user_id: userId,
        game_server_id: serverId || null,
        email,
        payment_method: selectedPayment.id,
      };

      const endpoint = user ? `${API_URL}/api/orders/authenticated` : `${API_URL}/api/orders/guest`;
      const headers = user ? { Authorization: `Bearer ${token}` } : {};

      // We need the product to exist — use a dynamic product name
      const orderRes = await axios.post(endpoint, {
        ...orderData,
        product_id: orderData.product_id,
        denomination_id: orderData.denomination_id,
      }, { headers }).catch(() => null);

      // If order creation from seed fails, create a simple order entry
      let orderId;
      if (!orderRes?.data?.order) {
        // Insert directly as a lightweight order
        const fallbackRes = await axios.post(`${API_URL}/api/orders/guest`, {
          product_id: 'digiflazz',
          denomination_id: selectedSku.sku,
          game_user_id: userId,
          game_server_id: serverId || null,
          email,
          payment_method: selectedPayment.id,
        }).catch(() => null);
        orderId = fallbackRes?.data?.order?.id || `BLZ-${Date.now()}`;
      } else {
        orderId = orderRes.data.order.id;
      }

      // 2. Create payment via Ayolinx
      const isQris = selectedPayment.id === 'qris';
      const payRes = await axios.post(`${API_URL}/api/payment/create`, {
        order_id: orderId,
        amount: selectedSku.price,
        customer_name: email.split('@')[0],
        customer_email: email,
        payment_method: isQris ? 'qris' : 'va',
        va_channel: selectedPayment.channel || 'bni',
        item_name: `${brand?.brand} - ${selectedSku.name}`,
      });

      if (payRes.data.success) {
        setPaymentData({ ...payRes.data.data, orderId });
        setPaymentStep('paying');
        toast.success('Payment berhasil dibuat!');
      } else {
        toast.error(payRes.data.message || 'Gagal membuat payment');
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses pesanan');
    } finally {
      setSubmitting(false);
    }
  };

  const copyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin!');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!brand) return null;

  // ==================== PAYING STEP ====================
  if (paymentStep === 'paying' && paymentData) {
    const isVA = paymentData.payment_method === 'virtual_account';
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-accent" />
            </div>
            <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">Menunggu Pembayaran</h1>
            <p className="text-muted-foreground">Selesaikan pembayaran dalam waktu 24 jam</p>
          </div>

          {/* Order summary */}
          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <div className="flex items-center gap-3 mb-4">
              <img src={brand.image} alt={brand.brand} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-medium text-white">{brand.brand}</p>
                <p className="text-sm text-primary">{selectedSku?.name}</p>
              </div>
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="font-mono text-2xl font-bold text-primary">
                Rp {selectedSku?.price?.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Payment info */}
          {isVA ? (
            <div className="bg-card rounded-xl p-6 border border-border mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1.5 rounded font-bold text-sm text-white"
                  style={{ backgroundColor: BANK_INFO[paymentData.channel]?.color || '#333' }}>
                  {BANK_INFO[paymentData.channel]?.name || paymentData.channel?.toUpperCase()}
                </span>
                <span className="text-white">Virtual Account</span>
              </div>
              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <p className="text-xs text-muted-foreground mb-2">Nomor Virtual Account</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl text-white font-bold tracking-wider">{paymentData.va_number}</span>
                  <button onClick={() => copyText(paymentData.va_number)} className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Transfer ke nomor VA di atas melalui ATM atau mobile banking.</p>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-6 border border-border mb-6">
              <div className="flex items-center gap-3 mb-4">
                <QrCode className="w-6 h-6 text-secondary" />
                <span className="font-medium text-white">QRIS</span>
              </div>
              <div className="bg-white rounded-xl p-6 mb-4 flex justify-center">
                {paymentData.qr_content ? (
                  <QRCodeCanvas value={paymentData.qr_content} size={220} level="M" marginSize={2} />
                ) : (
                  <div className="w-[220px] h-[220px] flex items-center justify-center">
                    <QrCode className="w-32 h-32 text-gray-300" />
                  </div>
                )}
              </div>
              <p className="text-center text-sm text-muted-foreground">Scan QR code dengan e-wallet atau mobile banking</p>
            </div>
          )}

          <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-white"
            onClick={() => { setPaymentStep('form'); setPaymentData(null); }}>
            <RefreshCw className="w-4 h-4 mr-2" /> Ganti Metode Pembayaran
          </Button>
        </div>
      </div>
    );
  }

  // ==================== FORM STEP ====================
  return (
    <div className="min-h-screen pt-16">
      {/* Banner */}
      <div className="relative h-48 md:h-56 overflow-hidden bg-gradient-to-r from-primary/20 to-black">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 max-w-7xl mx-auto">
          <Button variant="ghost" size="sm" className="text-white mb-4" onClick={() => navigate('/')}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <div className="flex items-center gap-4">
            <img src={brand.image} alt={brand.brand} className="w-16 h-16 md:w-20 md:h-20 rounded-xl object-cover border-2 border-white/20" />
            <div>
              <h1 className="font-rajdhani font-bold text-2xl md:text-3xl text-white uppercase">{brand.brand}</h1>
              <p className="text-muted-foreground text-sm">{products.length} item tersedia</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Instructions */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">Masukkan User ID (dan Server/Zone ID jika ada) sesuai akun game Anda.</p>
              </div>
            </div>

            {/* ID inputs */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">1. Data Akun</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">User ID</Label>
                  <Input placeholder="Masukkan User ID" className="bg-black/50 border-white/10 text-white font-mono"
                    value={userId} onChange={(e) => setUserId(e.target.value)} data-testid="df-user-id" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Server / Zone ID (opsional)</Label>
                  <Input placeholder="Masukkan Server ID" className="bg-black/50 border-white/10 text-white font-mono"
                    value={serverId} onChange={(e) => setServerId(e.target.value)} data-testid="df-server-id" />
                </div>
              </div>
            </div>

            {/* Item selection */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">2. Pilih Item</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products.map((p) => (
                  <button key={p.sku}
                    className={`denom-card p-4 rounded-xl text-left ${selectedSku?.sku === p.sku ? 'selected' : ''}`}
                    onClick={() => setSelectedSku(p)} data-testid={`sku-${p.sku}`}>
                    <p className="font-rajdhani font-semibold text-white text-sm">{p.name}</p>
                    <p className="font-mono text-sm text-primary mt-1">Rp {p.price.toLocaleString('id-ID')}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Payment */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">3. Pembayaran</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {PAYMENT_METHODS.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id}
                      className={`payment-card p-3 rounded-xl flex flex-col items-center gap-2 ${selectedPayment?.id === m.id ? 'selected' : ''}`}
                      onClick={() => setSelectedPayment(m)} data-testid={`pay-${m.id}`}>
                      <Icon className="w-5 h-5 text-secondary" />
                      <span className="text-xs font-medium text-white">{m.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Email */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">4. Email</h2>
              <Input type="email" placeholder="Masukkan email" className="bg-black/50 border-white/10 text-white"
                value={email} onChange={(e) => setEmail(e.target.value)} data-testid="df-email" />
            </div>
          </div>

          {/* Right: summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">Ringkasan</h2>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3">
                  <img src={brand.image} alt={brand.brand} className="w-12 h-12 rounded-lg object-cover" />
                  <div>
                    <p className="font-medium text-white">{brand.brand}</p>
                    {selectedSku && <p className="text-sm text-primary">{selectedSku.name}</p>}
                  </div>
                </div>
                {userId && (
                  <div className="bg-black/30 rounded-lg p-3 font-mono text-sm">
                    <p className="text-gray-300">User ID: <span className="text-white">{userId}</span></p>
                    {serverId && <p className="text-gray-300">Server: <span className="text-white">{serverId}</span></p>}
                  </div>
                )}
              </div>
              <div className="border-t border-border pt-4 mb-6 flex justify-between items-center">
                <span className="text-gray-300">Total</span>
                <span className="font-mono text-xl font-bold text-white">
                  {selectedSku ? `Rp ${selectedSku.price.toLocaleString('id-ID')}` : 'Rp 0'}
                </span>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider py-6"
                onClick={handleSubmit} disabled={submitting || !selectedSku || !selectedPayment}
                data-testid="df-order-btn">
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Memproses...</span>
                ) : (
                  <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> Beli Sekarang</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
