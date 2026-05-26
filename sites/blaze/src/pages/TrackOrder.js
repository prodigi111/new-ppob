import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { formatPrice, formatDate, getStatusColor, getStatusText } from '../lib/utils';
import { toast } from 'sonner';
import { Search, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      toast.error('Masukkan nomor order');
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const response = await axios.get(`${API_URL}/api/orders/track/${orderNumber.trim()}`);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Order not found:', error);
      setOrder(null);
      toast.error('Order tidak ditemukan');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-6 h-6 text-yellow-400" />;
      case 'processing':
        return <Package className="w-6 h-6 text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-400" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="font-rajdhani font-bold text-3xl text-white uppercase mb-2">
            Cek Transaksi
          </h1>
          <p className="text-muted-foreground">
            Masukkan nomor order untuk melihat status transaksi Anda
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-card rounded-xl p-6 border border-border mb-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderNumber" className="text-gray-300">Nomor Order</Label>
              <div className="flex gap-3">
                <Input
                  id="orderNumber"
                  type="text"
                  placeholder="Contoh: VV20260112..."
                  className="bg-black/50 border-white/10 text-white font-mono flex-1"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  data-testid="track-order-input"
                />
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 text-white"
                  disabled={loading}
                  data-testid="track-order-btn"
                >
                  {loading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>

        {/* Result */}
        {searched && !loading && (
          order ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Status Header */}
              <div className="p-6 border-b border-border">
                <div className="flex items-center gap-4">
                  {getStatusIcon(order.status)}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`font-rajdhani font-semibold text-lg uppercase ${
                      order.status === 'completed' ? 'text-green-400' :
                      order.status === 'pending' ? 'text-yellow-400' :
                      order.status === 'processing' ? 'text-blue-400' :
                      'text-red-400'
                    }`}>
                      {getStatusText(order.status)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Details */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-gray-400 text-sm">Order Number</span>
                  <span className="font-mono text-white text-sm">{order.order_number}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400 text-sm">Tanggal Order</span>
                  <span className="text-white text-sm">{formatDate(order.created_at)}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400 text-sm">Produk</span>
                  <span className="text-white text-sm">{order.product_name}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400 text-sm">Item</span>
                  <span className="text-white text-sm">{order.denomination_name}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-gray-400 text-sm">User ID</span>
                  <span className="font-mono text-white text-sm">{order.game_user_id}</span>
                </div>
                {order.game_server_id && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400 text-sm">Server ID</span>
                    <span className="font-mono text-white text-sm">{order.game_server_id}</span>
                  </div>
                )}
                <div className="border-t border-border pt-4 flex justify-between items-start">
                  <span className="text-gray-400 text-sm">Total</span>
                  <span className="font-mono text-lg font-bold text-primary">
                    {formatPrice(order.price)}
                  </span>
                </div>
                {order.completed_at && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-400 text-sm">Selesai pada</span>
                    <span className="text-green-400 text-sm">{formatDate(order.completed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-xl p-8 border border-border text-center">
              <XCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Order Tidak Ditemukan</p>
              <p className="text-muted-foreground text-sm">
                Pastikan nomor order yang Anda masukkan sudah benar
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
