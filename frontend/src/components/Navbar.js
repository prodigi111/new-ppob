import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { Button } from './ui/button';
import { imgUrl } from '../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  ShoppingBag, 
  LayoutDashboard,
  Search
} from 'lucide-react';
const BlazeLogo = '/logo-blaze.svg';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const { store, isReseller } = useStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
            {isReseller && store?.logo_url ? (
              <img src={imgUrl(store.logo_url)} alt={store.store_name} className="h-10 sm:h-12 w-auto object-contain" />
            ) : (
              <img src={BlazeLogo} alt="Blaze Store" className="h-10 sm:h-12 w-auto object-contain" />
            )}
            {isReseller && store?.store_name && (
              <span className="font-rajdhani font-bold text-white text-lg hidden sm:block">{store.store_name}</span>
            )}
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <Link 
              to="/" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
              data-testid="nav-home"
            >
              Home
            </Link>
            <Link 
              to="/track" 
              className="text-gray-300 hover:text-white transition-colors font-medium"
              data-testid="nav-track"
            >
              Cek Transaksi
            </Link>
            {user?.role !== 'reseller' && user?.role !== 'admin' && (
              <Link 
                to="/reseller" 
                className="text-secondary hover:text-secondary/80 transition-colors font-medium"
                data-testid="nav-reseller"
              >
                Daftar Reseller
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-white hover:bg-white/10"
                    data-testid="user-menu-trigger"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                    <span className="hidden sm:block">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium text-white">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {user.role !== 'user' && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary capitalize">
                        {user.role}
                      </span>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2 cursor-pointer" data-testid="menu-profile">
                      <ShoppingBag className="w-4 h-4" />
                      Riwayat Transaksi
                    </Link>
                  </DropdownMenuItem>
                  {user.role === 'reseller' && (
                    <DropdownMenuItem asChild>
                      <Link to="/reseller/dashboard" className="flex items-center gap-2 cursor-pointer" data-testid="menu-reseller-dashboard">
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard Reseller
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {user.role === 'admin' && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer" data-testid="menu-admin">
                        <LayoutDashboard className="w-4 h-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive cursor-pointer"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  className="text-white hover:bg-white/10"
                  onClick={() => navigate('/login')}
                  data-testid="login-btn"
                >
                  Masuk
                </Button>
                <Button 
                  className="bg-primary hover:bg-primary/90 text-white font-rajdhani uppercase tracking-wider"
                  onClick={() => navigate('/register')}
                  data-testid="register-btn"
                >
                  Daftar
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-card border-b border-border p-4 space-y-3">
            <Link 
              to="/" 
              className="block text-gray-300 hover:text-white py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/track" 
              className="block text-gray-300 hover:text-white py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Cek Transaksi
            </Link>
            {user?.role !== 'reseller' && user?.role !== 'admin' && (
              <Link 
                to="/reseller" 
                className="block text-secondary hover:text-secondary/80 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Daftar Reseller
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
