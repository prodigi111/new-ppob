import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import {
  ChevronLeft, Zap, AlertCircle, QrCode, Building2, Loader2,
  Copy, Clock, CheckCircle2, RefreshCw, Phone, Gamepad2, ShoppingBag,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { PaymentBadges } from '../components/PaymentBadges';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PAYMENT_METHODS = [
  { id: 'qris', name: 'QRIS', icon: QrCode, desc: 'GoPay, OVO, Dana, dll' },
  { id: 'va_bni', name: 'VA BNI', icon: Building2, desc: 'Transfer via BNI', channel: 'bni' },
  { id: 'va_bri', name: 'VA BRI', icon: Building2, desc: 'Transfer via BRI', channel: 'bri' },
  { id: 'va_mandiri', name: 'VA Mandiri', icon: Building2, desc: 'Transfer via Mandiri', channel: 'mandiri' },
  { id: 'va_cimb', name: 'VA CIMB', icon: Building2, desc: 'Transfer via CIMB', channel: 'cimb' },
];

const BANK_INFO = {
  bni: { name: 'BNI', color: '#f15a22' },
  bri: { name: 'BRI', color: '#00529c' },
  mandiri: { name: 'Mandiri', color: '#003366' },
  cimb: { name: 'CIMB', color: '#ec1c24' },
};

// Default fallback config
const DEFAULT_CFG = {
  type: 'game_id',
  id_label: 'User ID',
  id_placeholder: 'Masukkan User ID',
  id_required: true,
  show_id2: false,
  instruction: 'Masukkan data akun Anda.',
  success_label: 'User ID',
};

export default function DigiFlazzProduct() {
  const { brandSlug } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();

  const [brand, setBrand] = useState(null);
  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState('games');
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [userId, setUserId] = useState('');
  const [serverId, setServerId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);

  const [paymentData, setPaymentData] = useState(null);
  const [paymentStep, setPaymentStep] = useState('form');
  const [orderStatus, setOrderStatus] = useState(null);

  useEffect(() => { fetchBrand(); }, [brandSlug]);
  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);

  // Poll payment status
  useEffect(() => {
    if (paymentStep !== 'paying' || !paymentData?.orderId) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/payment/status/${paymentData.orderId}`);
        if (!active) return;
        setOrderStatus(res.data);
        if (res.data.status === 'paid' || res.data.status === 'completed') {
          setPaymentStep('success');
          return;
        }
        if (res.data.status === 'failed' || res.data.status === 'cancelled') {
          setPaymentStep('failed');
          return;
        }
      } catch {}
      if (active) setTimeout(poll, 4000);
    };
    setTimeout(poll, 4000);
    return () => { active = false; };
  }, [paymentStep, paymentData?.orderId]);

  // Keep polling on success for SN
  useEffect(() => {
    if (paymentStep !== 'success' || !paymentData?.orderId) return;
    if (orderStatus?.digiflazz_sn && orderStatus?.status === 'completed') return;
    let active = true;
    const poll = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/payment/status/${paymentData.orderId}`);
        if (!active) return;
        setOrderStatus(res.data);
        if (res.data.digiflazz_sn && res.data.status === 'completed') return;
      } catch {}
      if (active) setTimeout(poll, 5000);
    };
    setTimeout(poll, 3000);
    return () => { active = false; };
  }, [paymentStep, paymentData?.orderId, orderStatus?.digiflazz_sn]);

  const fetchBrand = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/biller/catalog/${brandSlug}`);
      setBrand(res.data);
      setProducts(res.data.products || []);
      setCategory(res.data.category || 'games');
      if (res.data.input_config) setCfg(res.data.input_config);
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
    if (cfg.id_required && !userId) return toast.error(`Masukkan ${cfg.id_label}`);
    if (!email) return toast.error('Masukkan email');

    setSubmitting(true);
    try {
      const orderRes = await axios.post(`${API_URL}/api/orders/digiflazz`, {
        brand: brand.brand,
        sku_code: selectedSku.sku,
        product_name: selectedSku.name,
        game_user_id: userId,
        game_server_id: serverId || null,
        email,
        payment_method: selectedPayment.id,
        price: selectedSku.price,
      });
      const orderId = orderRes.data.order.id;

      const isQris = selectedPayment.id === 'qris';
      const payRes = await axios.post(`${API_URL}/api/payment/create`, {
        order_id: orderId,
        amount: selectedSku.price,
        customer_name: email.split('@')[0],
        customer_email: email,
        payment_method: isQris ? 'qris' : 'va',
        va_channel: selectedPayment.channel || 'bni',
        item_name: `${brand?.brand} - ${selectedSku.name}`,
        digiflazz_sku: selectedSku.sku,
        customer_game_id: cfg.show_id2 && serverId ? `${userId}${serverId}` : userId,
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

  // ==================== FAILED / CANCELLED ====================
  if (paymentStep === 'failed') {
    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">
            {orderStatus?.status === 'cancelled' ? 'Pembayaran Dibatalkan' : 'Pembayaran Gagal'}
          </h1>
          <p className="text-muted-foreground mb-8">
            {orderStatus?.status === 'cancelled'
              ? 'Pembayaran tidak diselesaikan atau QRIS telah expired. Silakan coba lagi.'
              : 'Terjadi kesalahan pada pembayaran. Silakan coba lagi.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" className="border-border text-white hover:bg-white/5"
              onClick={() => { setPaymentStep('form'); setPaymentData(null); setOrderStatus(null); }}>
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-white" onClick={() => navigate('/')}>
              Kembali ke Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ==================== SUCCESS ====================
  if (paymentStep === 'success') {
    const isVoucher = category === 'voucher';
    const hasSn = orderStatus?.digiflazz_sn;
    const topupDone = orderStatus?.topup_status === 'success';
    const topupFailed = orderStatus?.topup_status === 'failed';
    const isProcessing = !hasSn && !topupFailed;

    return (
      <div className="min-h-screen pt-24 pb-12">
        <div className="max-w-lg mx-auto px-4 text-center">

          {/* Header - changes based on state */}
          {isProcessing ? (
            <>
              <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              </div>
              <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">Memproses Pesanan...</h1>
              <p className="text-muted-foreground mb-4">
                Pembayaran berhasil! Sedang memproses {isVoucher ? 'kode voucher' : category === 'pulsa' ? 'pengiriman pulsa' : 'top-up'} Anda.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-yellow-400 text-sm font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Jangan tinggalkan halaman ini
                </div>
                <p className="text-xs text-yellow-400/70">
                  {isVoucher ? 'Kode voucher akan muncul di halaman ini dalam beberapa saat.' :
                   category === 'pulsa' ? 'Konfirmasi pengiriman pulsa akan muncul di halaman ini.' :
                   'Hasil top-up akan muncul di halaman ini dalam beberapa saat.'}
                </p>
              </div>

              {/* Processing animation */}
              <div className="flex justify-center gap-1 mb-6">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">
                {topupFailed ? 'Pembayaran Berhasil' : 'Transaksi Selesai!'}
              </h1>
              <p className="text-muted-foreground mb-6">
                {topupFailed ? 'Pembayaran berhasil namun top-up gagal. Hubungi admin.' :
                 'Terima kasih telah menggunakan BlazeStore!'}
              </p>
            </>
          )}

          {/* SN / Voucher Code */}
          {hasSn && (
            <div className="bg-green-500/10 border-2 border-green-500/40 rounded-xl p-5 mb-6">
              <p className="text-xs text-green-400 mb-2 uppercase tracking-wider">
                {isVoucher ? 'Kode Voucher' : category === 'pulsa' ? 'Serial Number' : 'SN / Token'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-white font-bold text-lg break-all">{orderStatus.digiflazz_sn}</span>
                <button onClick={() => copyText(orderStatus.digiflazz_sn)}
                  className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 flex-shrink-0">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {isVoucher && (
                <p className="text-xs text-muted-foreground mt-3">Simpan kode ini. Gunakan untuk redeem di platform terkait.</p>
              )}
            </div>
          )}

          {/* Top-up failed warning */}
          {topupFailed && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
              <p className="text-red-400 text-sm font-medium">Top-up gagal diproses</p>
              {orderStatus?.topup_error && (
                <p className="text-xs text-red-400/70 mt-1">{orderStatus.topup_error}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">Silakan hubungi admin untuk proses manual atau refund.</p>
            </div>
          )}

          {/* Order details */}
          <div className="bg-card rounded-xl p-6 border border-border mb-6 text-left">
            <div className="flex items-center gap-3 mb-4">
              <img src={brand?.image} alt={brand?.brand} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-medium text-white">{brand?.brand}</p>
                <p className="text-sm text-primary">{selectedSku?.name}</p>
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">{cfg.success_label}</span>
                <span className="font-mono text-white">{userId}{cfg.show_id2 && serverId ? ` (${serverId})` : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status Pembayaran</span>
                <span className="text-green-500 font-medium">Berhasil</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Status {isVoucher ? 'Voucher' : category === 'pulsa' ? 'Pengiriman' : 'Top-up'}</span>
                <span className={`font-medium ${topupDone ? 'text-green-500' : topupFailed ? 'text-red-500' : 'text-yellow-500'}`}>
                  {topupDone ? 'Berhasil' : topupFailed ? 'Gagal' : 'Diproses...'}
                </span>
              </div>
            </div>
            <div className="border-t border-border mt-4 pt-4 flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="font-mono text-xl font-bold text-green-500">Rp {selectedSku?.price?.toLocaleString('id-ID')}</span>
            </div>
          </div>

          {/* Buttons - only show when processing is done */}
          {!isProcessing && (
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-border text-white hover:bg-white/5" onClick={() => navigate('/track')}>Cek Transaksi</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={() => navigate('/')}>Kembali ke Home</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== PAYING ====================
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

          <div className="bg-card rounded-xl p-6 border border-border mb-6">
            <div className="flex items-center gap-3 mb-4">
              <img src={brand.image} alt={brand.brand} className="w-12 h-12 rounded-lg object-cover" />
              <div>
                <p className="font-medium text-white">{brand.brand}</p>
                <p className="text-sm text-primary">{selectedSku?.name}</p>
              </div>
            </div>
            <div className="text-sm text-gray-400 mb-3">
              {cfg.success_label}: <span className="text-white font-mono">{userId}{cfg.show_id2 && serverId ? ` (${serverId})` : ''}</span>
            </div>
            <div className="border-t border-border pt-4 flex justify-between items-center">
              <span className="text-gray-400">Total</span>
              <span className="font-mono text-2xl font-bold text-primary">Rp {selectedSku?.price?.toLocaleString('id-ID')}</span>
            </div>
          </div>

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
          <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Menunggu konfirmasi pembayaran...
          </p>
        </div>
      </div>
    );
  }

  // ==================== FORM ====================

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
          <div className="lg:col-span-2 space-y-8">
            {/* Instructions */}
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                <p className="text-sm text-gray-300">{cfg.instruction}</p>
              </div>
            </div>

            {/* ID inputs - adapted per category */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4 flex items-center gap-2">
                {cfg.type === 'phone' ? <Phone className="w-5 h-5 text-primary" /> :
                 cfg.type === 'voucher_code' ? <ShoppingBag className="w-5 h-5 text-primary" /> :
                 <Gamepad2 className="w-5 h-5 text-primary" />}
                1. {cfg.type === 'voucher_code' ? 'Informasi' : 'Data Tujuan'}
              </h2>
              <div className={`grid grid-cols-1 ${cfg.show_id2 ? 'md:grid-cols-2' : ''} gap-4`}>
                <div className="space-y-2">
                  <Label className="text-gray-300">{cfg.id_label}</Label>
                  <Input placeholder={cfg.id_placeholder} className="bg-black/50 border-white/10 text-white font-mono"
                    value={userId} onChange={(e) => setUserId(e.target.value)} data-testid="df-user-id" />
                </div>
                {cfg.show_id2 && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">{cfg.id2_label}</Label>
                    <Input placeholder={cfg.id2_placeholder} className="bg-black/50 border-white/10 text-white font-mono"
                      value={serverId} onChange={(e) => setServerId(e.target.value)} data-testid="df-server-id" />
                  </div>
                )}
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
              <div className="mt-4 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Didukung oleh</p>
              </div>
            </div>

            {/* Email */}
            <div className="bg-card rounded-xl p-6 border border-border">
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase mb-4">4. Email</h2>
              <Input type="email" placeholder="Masukkan email" className="bg-black/50 border-white/10 text-white"
                value={email} onChange={(e) => setEmail(e.target.value)} data-testid="df-email" />
            </div>
          </div>

          {/* Summary */}
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
                    <p className="text-gray-300">{cfg.id_label}: <span className="text-white">{userId}</span></p>
                    {cfg.show_id2 && serverId && <p className="text-gray-300">{cfg.id2_label}: <span className="text-white">{serverId}</span></p>}
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
