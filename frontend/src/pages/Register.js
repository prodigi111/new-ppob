import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error('Semua field harus diisi');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Password tidak cocok');
      return;
    }

    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }

    setLoading(true);
    try {
      const user = await register(name, email, password);
      toast.success(`Selamat datang, ${user.name}!`);
      navigate('/');
    } catch (error) {
      console.error('Registration failed:', error);
      toast.error(error.response?.data?.detail || 'Registrasi gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-rajdhani font-bold text-2xl text-white uppercase">
            Buat Akun Baru
          </h1>
          <p className="text-muted-foreground text-sm mt-2">
            Daftar untuk mendapatkan harga terbaik dan riwayat transaksi
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-6 border border-border">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-300">Nama Lengkap</Label>
              <Input
                id="name"
                type="text"
                placeholder="Masukkan nama"
                className="bg-black/50 border-white/10 text-white"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="register-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                className="bg-black/50 border-white/10 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                data-testid="register-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Minimal 6 karakter"
                  className="bg-black/50 border-white/10 text-white pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="register-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-gray-300">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                className="bg-black/50 border-white/10 text-white"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="register-confirm-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider py-6"
              disabled={loading}
              data-testid="register-submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Mendaftar...
                </span>
              ) : (
                'Daftar Sekarang'
              )}
            </Button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground text-sm">
              Sudah punya akun?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Masuk di sini
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
