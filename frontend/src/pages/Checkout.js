import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { formatPrice } from '../lib/utils';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Clock, 
  Copy, 
  QrCode,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Checkout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!order && orderId) {
      // In real app, fetch order details
      toast.error('Order tidak ditemukan');
      navigate('/');
    }
  }, [orderId, order, navigate]);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Simulate payment processing (MOCK)
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
              Top-up berhasil diproses. Terima kasih telah menggunakan VoucherVerse.
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
        ) : (
          /* Payment State */
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

            {/* Payment Instructions (MOCK) */}
            <div className="bg-card rounded-xl p-6 border border-border mb-6">
              <div className="flex items-center gap-3 mb-4">
                <QrCode className="w-6 h-6 text-secondary" />
                <span className="font-medium text-white">Pembayaran {order.payment_method?.toUpperCase()}</span>
              </div>

              <div className="bg-black/30 rounded-lg p-4 mb-4">
                <p className="text-center text-sm text-muted-foreground mb-2">
                  Demo Mode - Klik tombol di bawah untuk simulasi pembayaran
                </p>
                <div className="flex justify-center">
                  <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
                    <QrCode className="w-20 h-20 text-black" />
                  </div>
                </div>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                * Ini adalah simulasi pembayaran untuk demo
              </p>
            </div>

            <Button
              className="w-full bg-success hover:bg-success/90 text-black font-rajdhani uppercase tracking-wider py-6"
              onClick={handlePayment}
              disabled={processing}
              data-testid="simulate-payment-btn"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                  Memproses...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Simulasi Pembayaran Berhasil
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
