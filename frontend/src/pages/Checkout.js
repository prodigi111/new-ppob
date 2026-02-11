import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { PaymentBadges } from '../components/PaymentBadges';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Clock, 
  Copy, 
  QrCode,
  ArrowRight,
  Building2,
  CreditCard,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Bank logos/colors
const BANK_INFO = {
  bca: { name: 'BCA', color: '#003d79', textColor: 'white' },
  bni: { name: 'BNI', color: '#f15a22', textColor: 'white' },
  bri: { name: 'BRI', color: '#00529c', textColor: 'white' },
  mandiri: { name: 'Mandiri', color: '#003366', textColor: 'white' },
  permata: { name: 'Permata', color: '#009a44', textColor: 'white' },
  cimb: { name: 'CIMB Niaga', color: '#ec1c24', textColor: 'white' },
};

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('va');
  const [selectedBank, setSelectedBank] = useState('bni');
  const [paymentChannels, setPaymentChannels] = useState(null);
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    if (!order && orderId) {
      toast.error('Order tidak ditemukan');
      navigate('/');
    }
    // Fetch payment channels
    fetchPaymentChannels();
  }, [orderId, order, navigate]);

  const fetchPaymentChannels = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/payment/channels`);
      setPaymentChannels(response.data);
    } catch (error) {
      console.error('Failed to fetch payment channels:', error);
    }
  };

  const createPayment = async () => {
    if (!order) return;
    
    setCreatingPayment(true);
    try {
      const response = await axios.post(`${API_URL}/api/payment/create`, {
        order_id: order.id,
        amount: order.price,
        customer_name: order.user_email?.split('@')[0] || 'Customer',
        customer_email: order.user_email,
        payment_method: selectedPaymentMethod,
        va_channel: selectedBank
      });
      
      if (response.data.success) {
        setPaymentData(response.data.data);
        toast.success('Payment berhasil dibuat!');
      } else {
        toast.error(response.data.message || 'Gagal membuat payment');
      }
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast.error('Gagal membuat payment. Menggunakan mode simulasi.');
      // Fallback to mock mode
      setPaymentData({
        success: true,
        payment_method: selectedPaymentMethod,
        channel: selectedBank,
        va_number: '8810' + Math.random().toString().slice(2, 16),
        amount: order.price,
        is_mock: true
      });
    } finally {
      setCreatingPayment(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Simulate payment processing
      const response = await axios.post(`${API_URL}/api/payment/process/${order.id}`);
      setOrder(response.data.order);
      toast.success('Pembayaran berhasil!');
    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Pembayaran gagal');
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const isCompleted = order.status === 'completed';

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-lg mx-auto px-4">
        {isCompleted ? (
          /* Success State */
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">
              Pembayaran Berhasil!
            </h1>
            <p className="text-muted-foreground mb-8">
              Top-up berhasil diproses. Terima kasih telah menggunakan BlazeStore.
            </p>

            <div className="bg-card rounded-xl p-6 border border-border mb-6 text-left">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Number</span>
                  <span className="font-mono text-white">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Produk</span>
                  <span className="text-white">{order.product_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Item</span>
                  <span className="text-white">{order.denomination_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">User ID</span>
                  <span className="font-mono text-white">{order.game_user_id}</span>
                </div>
                {order.game_server_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Server ID</span>
                    <span className="font-mono text-white">{order.game_server_id}</span>
                  </div>
                )}
                <div className="border-t border-border pt-4 flex justify-between">
                  <span className="text-gray-400">Total</span>
                  <span className="font-mono text-lg font-bold text-success">
                    {formatPrice(order.price)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border text-white hover:bg-white/5"
                onClick={() => navigate('/track')}
              >
                Cek Transaksi
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white"
                onClick={() => navigate('/')}
              >
                Kembali ke Home
              </Button>
            </div>
          </div>
        ) : !paymentData ? (
          /* Payment Method Selection */
          <div>
            <div className="text-center mb-8">
              <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">
                Pilih Metode Pembayaran
              </h1>
              <p className="text-muted-foreground">
                Total: <span className="text-primary font-bold">{formatPrice(order.price)}</span>
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-xl p-4 border border-border mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-white">{order.product_name}</p>
                  <p className="text-sm text-muted-foreground">{order.denomination_name}</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Order: {order.order_number}
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSelectedPaymentMethod('va')}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                  selectedPaymentMethod === 'va'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                }`}
              >
                <Building2 className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">Virtual Account</span>
              </button>
              <button
                onClick={() => setSelectedPaymentMethod('qris')}
                className={`flex-1 py-3 px-4 rounded-lg border transition-all ${
                  selectedPaymentMethod === 'qris'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                }`}
              >
                <QrCode className="w-5 h-5 mx-auto mb-1" />
                <span className="text-sm font-medium">QRIS</span>
              </button>
            </div>

            {/* Bank Selection for VA */}
            {selectedPaymentMethod === 'va' && (
              <div className="bg-card rounded-xl p-4 border border-border mb-6">
                <p className="text-sm text-muted-foreground mb-3">Pilih Bank:</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentChannels?.virtual_account?.map((bank) => (
                    <button
                      key={bank.code}
                      onClick={() => setSelectedBank(bank.code)}
                      className={`py-3 px-2 rounded-lg border text-center transition-all ${
                        selectedBank === bank.code
                          ? 'border-primary bg-primary/10'
                          : 'border-border bg-black/20 hover:border-primary/50'
                      }`}
                    >
                      <span 
                        className="inline-block px-2 py-1 rounded text-xs font-bold mb-1"
                        style={{ 
                          backgroundColor: BANK_INFO[bank.code]?.color || '#333',
                          color: BANK_INFO[bank.code]?.textColor || 'white'
                        }}
                      >
                        {BANK_INFO[bank.code]?.name || bank.code.toUpperCase()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* QRIS Info */}
            {selectedPaymentMethod === 'qris' && (
              <div className="bg-card rounded-xl p-4 border border-border mb-6">
                <div className="flex items-center gap-3">
                  <QrCode className="w-10 h-10 text-secondary" />
                  <div>
                    <p className="font-medium text-white">QRIS</p>
                    <p className="text-sm text-muted-foreground">
                      Scan dengan semua e-wallet & mobile banking
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider py-6"
              onClick={createPayment}
              disabled={creatingPayment}
              data-testid="create-payment-btn"
            >
              {creatingPayment ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Membuat Pembayaran...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Lanjutkan Pembayaran
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        ) : (
          /* Payment Details */
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-accent" />
              </div>
              <h1 className="font-rajdhani font-bold text-2xl text-white uppercase mb-2">
                Menunggu Pembayaran
              </h1>
              <p className="text-muted-foreground">
                Selesaikan pembayaran dalam waktu 24 jam
              </p>
            </div>

            {/* Order Summary */}
            <div className="bg-card rounded-xl p-6 border border-border mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">Order Number</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-white text-sm">{order.order_number}</span>
                  <button
                    onClick={() => copyToClipboard(order.order_number)}
                    className="text-muted-foreground hover:text-white"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Produk</span>
                  <span className="text-white">{order.product_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Item</span>
                  <span className="text-white">{order.denomination_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">User ID</span>
                  <span className="font-mono text-white">{order.game_user_id}</span>
                </div>
              </div>

              <div className="border-t border-border mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">Total Pembayaran</span>
                  <span className="font-mono text-2xl font-bold text-primary">
                    {formatPrice(order.price)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Info */}
            {paymentData.payment_method === 'va' || paymentData.payment_method === 'virtual_account' ? (
              <div className="bg-card rounded-xl p-6 border border-border mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <span 
                    className="px-3 py-1.5 rounded font-bold text-sm"
                    style={{ 
                      backgroundColor: BANK_INFO[paymentData.channel]?.color || '#333',
                      color: BANK_INFO[paymentData.channel]?.textColor || 'white'
                    }}
                  >
                    {BANK_INFO[paymentData.channel]?.name || paymentData.channel?.toUpperCase()}
                  </span>
                  <span className="text-white">Virtual Account</span>
                </div>

                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Nomor Virtual Account</p>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xl text-white font-bold tracking-wider">
                      {paymentData.va_number}
                    </span>
                    <button
                      onClick={() => copyToClipboard(paymentData.va_number)}
                      className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Cara Pembayaran:</p>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>Buka aplikasi m-Banking atau ATM {BANK_INFO[paymentData.channel]?.name}</li>
                    <li>Pilih menu Transfer ke Virtual Account</li>
                    <li>Masukkan nomor VA di atas</li>
                    <li>Konfirmasi pembayaran</li>
                  </ol>
                </div>

                {paymentData.is_mock && (
                  <p className="text-xs text-center text-yellow-500 mt-4">
                    * Mode Demo - VA Number adalah simulasi
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-card rounded-xl p-6 border border-border mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <QrCode className="w-6 h-6 text-secondary" />
                  <span className="font-medium text-white">QRIS</span>
                </div>

                <div className="bg-white rounded-xl p-6 mb-4 flex justify-center">
                  {paymentData.qr_content ? (
                    <QRCodeCanvas
                      value={paymentData.qr_content}
                      size={220}
                      level="M"
                      marginSize={2}
                    />
                  ) : (
                    <div className="w-[220px] h-[220px] flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-gray-300" />
                    </div>
                  )}
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  Scan QR code dengan aplikasi e-wallet atau mobile banking
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-success hover:bg-success/90 text-black font-rajdhani uppercase tracking-wider py-6"
                onClick={handlePayment}
                disabled={processing}
                data-testid="simulate-payment-btn"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Saya Sudah Bayar
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-border text-muted-foreground hover:text-white"
                onClick={() => setPaymentData(null)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Ganti Metode Pembayaran
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
