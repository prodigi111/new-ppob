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
  X,
  Settings,
  FileText,
  CreditCard,
  Save,
  Image,
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
  const [dfBrands, setDfBrands] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [editingIcon, setEditingIcon] = useState(null);
  const [iconUrl, setIconUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [editingMargin, setEditingMargin] = useState(null);
  const [marginType, setMarginType] = useState('percent');
  const [marginValue, setMarginValue] = useState(10);
  // CMS
  const [cmsPages, setCmsPages] = useState({});
  const [editingCms, setEditingCms] = useState(null);
  const [cmsTitle, setCmsTitle] = useState('');
  const [cmsContent, setCmsContent] = useState('');
  const [savingCms, setSavingCms] = useState(false);
  // Payment Icons
  const [payIcons, setPayIcons] = useState([]);
  const [newIconName, setNewIconName] = useState('');
  const [newIconUrl, setNewIconUrl] = useState('');
  const [uploadingPayIcon, setUploadingPayIcon] = useState(false);

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
      const [dashboardRes, usersRes, ordersRes, productsRes, appsRes, catalogRes] = await Promise.all([
        axios.get(`${API_URL}/api/admin/dashboard`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/products`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/admin/reseller-applications`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/biller/catalog?show_all=true`),
      ]);
      setDashboard(dashboardRes.data);
      setUsers(usersRes.data.users);
      setOrders(ordersRes.data.orders);
      setProducts(productsRes.data.products);
      setApplications(appsRes.data.applications);
      if (catalogRes.data.success) setDfBrands(catalogRes.data.brands || []);

      // Fetch CMS pages
      const slugs = ['tentang-kami', 'kebijakan-privasi', 'syarat-ketentuan', 'hubungi-kami'];
      const cmsData = {};
      for (const s of slugs) {
        try {
          const r = await axios.get(`${API_URL}/api/cms/${s}`);
          cmsData[s] = r.data;
        } catch { cmsData[s] = { slug: s, title: '', content: '' }; }
      }
      setCmsPages(cmsData);

      // Fetch payment icons
      try {
        const piRes = await axios.get(`${API_URL}/api/payment-icons`);
        setPayIcons(piRes.data.icons || []);
      } catch {}
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

  const handleSyncDigiflazz = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API_URL}/api/biller/catalog/sync`);
      if (res.data.success) {
        toast.success(`Berhasil sync ${res.data.synced} produk dari DigiFlazz`);
        fetchData();
      } else {
        toast.error(res.data.error || 'Gagal sync (mungkin rate limit, coba lagi nanti)');
      }
    } catch (error) {
      toast.error('Gagal sync DigiFlazz');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateIcon = async (slug) => {
    if (!iconUrl.trim()) return toast.error('Masukkan URL icon atau upload file');
    try {
      await axios.put(`${API_URL}/api/biller/catalog/${slug}/icon`, { icon: iconUrl });
      toast.success('Icon berhasil diupdate');
      setEditingIcon(null);
      setIconUrl('');
      fetchData();
    } catch (error) {
      toast.error('Gagal update icon');
    }
  };

  const handleUploadIcon = async (slug, file) => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await axios.post(`${API_URL}/api/upload/icon`, formData);
      if (uploadRes.data.success) {
        const fullUrl = `${API_URL}${uploadRes.data.url}`;
        await axios.put(`${API_URL}/api/biller/catalog/${slug}/icon`, { icon: fullUrl });
        toast.success('Icon berhasil diupload & diupdate');
        setEditingIcon(null);
        setIconUrl('');
        fetchData();
      }
    } catch (error) {
      toast.error('Gagal upload icon');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateMargin = async (slug) => {
    try {
      await axios.put(`${API_URL}/api/biller/pricing/${slug}`, {
        margin_type: marginType,
        margin_value: Number(marginValue),
      });
      toast.success('Margin berhasil diupdate');
      setEditingMargin(null);
      fetchData();
    } catch (error) {
      toast.error('Gagal update margin');
    }
  };

  const handleToggleBrand = async (slug, currentActive) => {
    try {
      await axios.put(`${API_URL}/api/biller/catalog/${slug}/status`, { active: !currentActive });
      toast.success(!currentActive ? 'Brand diaktifkan' : 'Brand dinonaktifkan');
      fetchData();
    } catch (error) {
      toast.error('Gagal mengubah status');
    }
  };

  const handleSaveCms = async (slug) => {
    setSavingCms(true);
    try {
      await axios.put(`${API_URL}/api/cms/${slug}`, { title: cmsTitle, content: cmsContent }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Halaman berhasil disimpan');
      setEditingCms(null);
      fetchData();
    } catch (error) {
      toast.error('Gagal menyimpan');
    } finally {
      setSavingCms(false);
    }
  };

  const handleAddPayIcon = async () => {
    if (!newIconName.trim() || !newIconUrl.trim()) return toast.error('Isi nama dan URL icon');
    const updated = [...payIcons, { name: newIconName, url: newIconUrl }];
    try {
      await axios.put(`${API_URL}/api/payment-icons`, { icons: updated }, { headers: { Authorization: `Bearer ${token}` } });
      setPayIcons(updated);
      setNewIconName('');
      setNewIconUrl('');
      toast.success('Icon payment ditambahkan');
    } catch { toast.error('Gagal menambah icon'); }
  };

  const handleRemovePayIcon = async (idx) => {
    const updated = payIcons.filter((_, i) => i !== idx);
    try {
      await axios.put(`${API_URL}/api/payment-icons`, { icons: updated }, { headers: { Authorization: `Bearer ${token}` } });
      setPayIcons(updated);
      toast.success('Icon payment dihapus');
    } catch { toast.error('Gagal menghapus icon'); }
  };

  const handleUploadPayIcon = async (file) => {
    if (!file) return;
    setUploadingPayIcon(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/api/upload/icon`, formData);
      if (res.data.success) {
        setNewIconUrl(`${API_URL}${res.data.url}`);
        toast.success('Icon diupload');
      }
    } catch { toast.error('Gagal upload'); }
    finally { setUploadingPayIcon(false); }
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
            <TabsTrigger value="settings" className="data-[state=active]:bg-primary data-[state=active]:text-white">
              <Settings className="w-4 h-4 mr-2" />
              Settings
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
                  Katalog DigiFlazz ({dfBrands.length} brand)
                </h2>
                <Button
                  className="bg-primary hover:bg-primary/90 text-white"
                  onClick={handleSyncDigiflazz}
                  disabled={syncing}
                  data-testid="sync-digiflazz-btn"
                >
                  {syncing ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      Syncing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Sync DigiFlazz
                    </span>
                  )}
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead className="text-muted-foreground">Icon</TableHead>
                      <TableHead className="text-muted-foreground">Brand</TableHead>
                      <TableHead className="text-muted-foreground">Kategori</TableHead>
                      <TableHead className="text-muted-foreground">Produk</TableHead>
                      <TableHead className="text-muted-foreground">Harga Modal</TableHead>
                      <TableHead className="text-muted-foreground">Margin</TableHead>
                      <TableHead className="text-muted-foreground">Harga Jual</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dfBrands.map((brand) => (
                      <TableRow key={brand.slug} className={`border-border ${brand.active === false ? 'opacity-40' : ''}`}>
                        <TableCell>
                          <img src={brand.image} alt={brand.brand} className="w-12 h-12 rounded-lg object-cover" />
                        </TableCell>
                        <TableCell>
                          <p className="text-white font-medium">{brand.brand}</p>
                          <p className="text-xs text-muted-foreground font-mono">{brand.slug}</p>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            brand.category === 'games' ? 'bg-blue-500/20 text-blue-400' :
                            brand.category === 'pulsa' ? 'bg-green-500/20 text-green-400' :
                            'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {brand.category}
                          </span>
                        </TableCell>
                        <TableCell className="text-white">{brand.items.length} item</TableCell>
                        <TableCell className="font-mono text-muted-foreground text-xs">
                          Rp {Math.min(...brand.items.map(i => i.cost)).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          {editingMargin === brand.slug ? (
                            <div className="flex items-center gap-1 min-w-[200px]">
                              <select
                                className="bg-black/50 border border-white/10 text-white text-xs rounded px-1 py-1 h-8"
                                value={marginType}
                                onChange={(e) => setMarginType(e.target.value)}
                              >
                                <option value="percent">%</option>
                                <option value="fixed">Rp</option>
                              </select>
                              <Input
                                type="number"
                                className="bg-black/50 border-white/10 text-white text-xs h-8 w-20"
                                value={marginValue}
                                onChange={(e) => setMarginValue(e.target.value)}
                              />
                              <Button size="sm" className="h-8 bg-success hover:bg-success/90 px-2"
                                onClick={() => handleUpdateMargin(brand.slug)}>
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground"
                                onClick={() => setEditingMargin(null)}>
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              className="text-xs text-primary hover:underline cursor-pointer"
                              onClick={() => {
                                setEditingMargin(brand.slug);
                                setMarginType(brand.margin_type || 'percent');
                                setMarginValue(brand.margin_value ?? 10);
                              }}
                            >
                              {brand.margin_type === 'fixed'
                                ? `+Rp ${Number(brand.margin_value || 0).toLocaleString('id-ID')}`
                                : `+${brand.margin_value ?? 10}%`}
                            </button>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-primary font-medium">
                          Rp {Math.min(...brand.items.map(i => i.price)).toLocaleString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => handleToggleBrand(brand.slug, brand.active)}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                              brand.active !== false
                                ? 'bg-success/20 text-success hover:bg-success/30'
                                : 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                            }`}
                            data-testid={`toggle-${brand.slug}`}
                          >
                            {brand.active !== false ? 'Aktif' : 'Nonaktif'}
                          </button>
                        </TableCell>
                        <TableCell>
                          {editingIcon === brand.slug ? (
                            <div className="space-y-2 min-w-[300px]">
                              <div className="flex items-center gap-2">
                                <Input
                                  placeholder="Paste URL icon..."
                                  className="bg-black/50 border-white/10 text-white text-xs h-8"
                                  value={iconUrl}
                                  onChange={(e) => setIconUrl(e.target.value)}
                                  data-testid={`icon-input-${brand.slug}`}
                                />
                                <Button size="sm" className="h-8 bg-success hover:bg-success/90 px-2"
                                  onClick={() => handleUpdateIcon(brand.slug)} disabled={!iconUrl.trim()}>
                                  <Check className="w-3 h-3" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 px-2 text-muted-foreground"
                                  onClick={() => { setEditingIcon(null); setIconUrl(''); }}>
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                              <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border border-dashed border-primary/50 hover:border-primary bg-primary/5 text-xs text-primary">
                                <Plus className="w-3 h-3" />
                                {uploading ? 'Uploading...' : 'Upload dari komputer'}
                                <input type="file" accept="image/*" className="hidden"
                                  onChange={(e) => handleUploadIcon(brand.slug, e.target.files[0])}
                                  disabled={uploading} />
                              </label>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white h-8"
                              onClick={() => { setEditingIcon(brand.slug); setIconUrl(brand.image); }}
                              data-testid={`edit-icon-${brand.slug}`}>
                              <Pencil className="w-3 h-3 mr-1" /> Ubah Icon
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Seed Products (legacy) */}
            {products.length > 0 && (
              <div className="bg-card rounded-xl border border-border overflow-hidden mt-6">
                <div className="p-6 border-b border-border">
                  <h2 className="font-rajdhani font-semibold text-lg text-white uppercase">
                    Produk Seed ({products.length})
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
                              <img src={product.image} alt={product.name} className="w-10 h-10 rounded-lg object-cover" />
                              <div>
                                <p className="text-white font-medium">{product.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{product.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{product.category}</TableCell>
                          <TableCell>{product.denominations?.length || 0} item</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 text-xs rounded-full ${product.is_active ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
                              {product.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
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

          {/* Settings Tab */}
          <TabsContent value="settings">
            <div className="space-y-6">
              {/* CMS Pages */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Halaman CMS
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">Edit konten Tentang Kami, Kebijakan Privasi, dll</p>
                </div>
                <div className="p-6 space-y-4">
                  {[
                    { slug: 'tentang-kami', label: 'Tentang Kami' },
                    { slug: 'kebijakan-privasi', label: 'Kebijakan Privasi' },
                    { slug: 'syarat-ketentuan', label: 'Syarat & Ketentuan' },
                    { slug: 'hubungi-kami', label: 'Hubungi Kami' },
                  ].map((pg) => (
                    <div key={pg.slug} className="border border-border rounded-lg p-4">
                      {editingCms === pg.slug ? (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-gray-300 text-sm">Judul</Label>
                            <Input
                              className="bg-black/50 border-white/10 text-white"
                              value={cmsTitle}
                              onChange={(e) => setCmsTitle(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-gray-300 text-sm">Konten</Label>
                            <textarea
                              className="w-full bg-black/50 border border-white/10 text-white rounded-md p-3 text-sm min-h-[150px] focus:outline-none focus:border-primary"
                              value={cmsContent}
                              onChange={(e) => setCmsContent(e.target.value)}
                              placeholder="Tulis konten halaman... (gunakan enter untuk paragraf baru)"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleSaveCms(pg.slug)} disabled={savingCms}>
                              <Save className="w-3 h-3 mr-1" /> {savingCms ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setEditingCms(null)}>
                              Batal
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{pg.label}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {cmsPages[pg.slug]?.content || 'Belum ada konten'}
                            </p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white"
                            onClick={() => {
                              setEditingCms(pg.slug);
                              setCmsTitle(cmsPages[pg.slug]?.title || pg.label);
                              setCmsContent(cmsPages[pg.slug]?.content || '');
                            }}>
                            <Pencil className="w-3 h-3 mr-1" /> Edit
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method Icons */}
              <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                  <h2 className="font-rajdhani font-semibold text-lg text-white uppercase flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> Icon Payment Method
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">Icon yang tampil di footer website</p>
                </div>
                <div className="p-6">
                  {/* Current icons */}
                  <div className="flex flex-wrap gap-4 mb-6">
                    {payIcons.map((ic, i) => (
                      <div key={i} className="relative group bg-white/5 rounded-lg p-3 flex items-center gap-2">
                        <img src={ic.url} alt={ic.name} className="h-8 object-contain" />
                        <span className="text-xs text-gray-300">{ic.name}</span>
                        <button
                          onClick={() => handleRemovePayIcon(i)}
                          className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {!payIcons.length && <p className="text-muted-foreground text-sm">Belum ada icon (menggunakan default)</p>}
                  </div>

                  {/* Add new */}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-white text-sm font-medium">Tambah Icon</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input placeholder="Nama (cth: QRIS)" className="bg-black/50 border-white/10 text-white"
                        value={newIconName} onChange={(e) => setNewIconName(e.target.value)} />
                      <div className="flex gap-2">
                        <Input placeholder="URL icon..." className="bg-black/50 border-white/10 text-white"
                          value={newIconUrl} onChange={(e) => setNewIconUrl(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <label className="flex items-center gap-1 cursor-pointer px-3 py-2 rounded-lg border border-dashed border-primary/50 hover:border-primary bg-primary/5 text-xs text-primary whitespace-nowrap">
                          <Image className="w-3 h-3" />
                          {uploadingPayIcon ? 'Uploading...' : 'Upload'}
                          <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => handleUploadPayIcon(e.target.files[0])} disabled={uploadingPayIcon} />
                        </label>
                        <Button className="bg-primary hover:bg-primary/90" onClick={handleAddPayIcon}
                          disabled={!newIconName.trim() || !newIconUrl.trim()}>
                          <Plus className="w-4 h-4 mr-1" /> Tambah
                        </Button>
                      </div>
                    </div>
                    {newIconUrl && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Preview:</span>
                        <img src={newIconUrl} alt="preview" className="h-8 object-contain bg-white/10 rounded p-1" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
