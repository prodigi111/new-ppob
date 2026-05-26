import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { formatPrice, formatDate, getStatusColor, getStatusText } from '../lib/utils';
import { ShoppingBag, User, Clock } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Profile() {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Profile Header */}
        <div className="bg-card rounded-xl p-6 border border-border mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="font-rajdhani font-bold text-xl text-white">{user.name}</h1>
              <p className="text-muted-foreground text-sm">{user.email}</p>
              {user.role !== 'user' && (
                <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary capitalize">
                  {user.role}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-primary" />
              <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                Riwayat Transaksi
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : orders.length > 0 ? (
            <div className="divide-y divide-border">
              {orders.map((order) => (
                <div key={order.id} className="p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-white">{order.product_name}</p>
                        <p className="text-sm text-muted-foreground">{order.denomination_name}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="font-mono">{order.order_number}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(order.created_at)}
                      </span>
                    </div>
                    <span className="font-mono text-primary font-medium">
                      {formatPrice(order.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-white font-medium mb-2">Belum Ada Transaksi</p>
              <p className="text-muted-foreground text-sm mb-4">
                Mulai top up game favorit Anda sekarang
              </p>
              <Button
                onClick={() => navigate('/')}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Mulai Top Up
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
