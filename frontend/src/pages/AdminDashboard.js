import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { formatPrice, formatDate, getStatusColor, getStatusText } from '../lib/utils';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  Package,
  UserPlus,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Check,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login?redirect=/admin');
      return;
    }
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    try {
      const [dashboardRes, usersRes, ordersRes, productsRes, appsRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/reseller-applications`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setDashboard(dashboardRes.data);
      setUsers(usersRes.data.users);
      setOrders(ordersRes.data.orders);
      setProducts(productsRes.data.products);
      setApplications(appsRes.data.applications);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReseller = async (appId) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/reseller-applications/${appId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Reseller disetujui');
      fetchData();
    } catch (error) {
      toast.error('Gagal menyetujui reseller');
    }
  };

  const handleRejectReseller = async (appId) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/reseller-applications/${appId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Aplikasi ditolak');
      fetchData();
    } catch (error) {
      toast.error('Gagal menolak aplikasi');
    }
  };

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(
        `${API_URL}/api/admin/orders/${orderId}/status?status=${status}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Status order diperbarui');
      fetchData();
    } catch (error) {
      toast.error('Gagal memperbarui status');
    }
  };

  if (!user || user.role !== 'admin') return null;

  if (loading) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="font-rajdhani font-bold text-2xl text-white uppercase">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground">Kelola produk, order, dan pengguna</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              Produk
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="resellers" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Reseller
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <TrendingUp className="w-5 h-5 text-success" />
                  <span className="text-muted-foreground text-sm">Total Revenue</span>
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {formatPrice(dashboard?.total_revenue || 0)}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                  <span className="text-muted-foreground text-sm">Total Orders</span>
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {dashboard?.total_orders || 0}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-secondary" />
                  <span className="text-muted-foreground text-sm">Total Users</span>
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {dashboard?.total_users || 0}
                </p>
              </div>
              <div className="bg-card rounded-xl p-6 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <UserPlus className="w-5 h-5 text-accent" />
                  <span className="text-muted-foreground text-sm">Pending Reseller</span>
                </div>
                <p className="font-mono text-2xl font-bold text-white">
                  {dashboard?.pending_applications || 0}
                </p>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Order Terbaru
                </h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Order</TableHead>
                      <TableHead className="text-muted-foreground">Produk</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Total</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboard?.recent_orders?.map((order) => (
                      <TableRow key={order.id} className="border-border">
                        <TableCell className="font-mono text-sm">{order.order_number}</TableCell>
                        <TableCell>{order.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{order.user_email}</TableCell>
                        <TableCell className="font-mono text-primary">{formatPrice(order.price)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                            {getStatusText(order.status)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Semua Order
                </h2>
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
                      <TableHead className="text-muted-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
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
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleUpdateOrderStatus(order.id, value)}
                          >
                            <SelectTrigger className="w-32 h-8 bg-black/50 border-border text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="processing">Processing</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="failed">Failed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between">
                <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Produk ({products.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Produk</TableHead>
                      <TableHead className="text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-muted-foreground">Denominasi</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id} className="border-border">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="text-white font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{product.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="capitalize">{product.category}</TableCell>
                        <TableCell>{product.denominations?.length || 0} item</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            product.is_active 
                              ? 'bg-success/20 text-success' 
                              : 'bg-destructive/20 text-destructive'
                          }`}>
                            {product.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Pengguna ({users.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Nama</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Role</TableHead>
                      <TableHead className="text-muted-foreground">Saldo</TableHead>
                      <TableHead className="text-muted-foreground">Terdaftar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id} className="border-border">
                        <TableCell className="text-white">{u.name}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                            u.role === 'admin' 
                              ? 'bg-primary/20 text-primary' 
                              : u.role === 'reseller'
                              ? 'bg-secondary/20 text-secondary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {u.role}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatPrice(u.balance || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(u.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Reseller Applications Tab */}
          <TabsContent value="resellers">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-6 border-b border-border">
                <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                  Aplikasi Reseller
                </h2>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Nama</TableHead>
                      <TableHead className="text-muted-foreground">Email</TableHead>
                      <TableHead className="text-muted-foreground">Telepon</TableHead>
                      <TableHead className="text-muted-foreground">Bisnis</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applications.map((app) => (
                      <TableRow key={app.id} className="border-border">
                        <TableCell className="text-white">{app.user?.name || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{app.user?.email || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">{app.phone}</TableCell>
                        <TableCell>{app.business_name || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                            app.status === 'approved' 
                              ? 'bg-success/20 text-success' 
                              : app.status === 'rejected'
                              ? 'bg-destructive/20 text-destructive'
                              : 'bg-accent/20 text-accent'
                          }`}>
                            {app.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          {app.status === 'pending' && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90 text-black h-8"
                                onClick={() => handleApproveReseller(app.id)}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8"
                                onClick={() => handleRejectReseller(app.id)}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
