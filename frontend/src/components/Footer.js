import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Instagram, Twitter } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { imgUrl } from '../lib/utils';
const BlazeLogo = '/logo-blaze.svg';

export const Footer = () => {
  const { store, isReseller } = useStore();
  const storeName = isReseller ? store?.store_name || 'Store' : 'BlazeStore';
  const logoSrc = isReseller && store?.logo_url ? imgUrl(store.logo_url) : BlazeLogo;
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src={logoSrc} alt={storeName} className="h-10 w-auto object-contain" />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Platform top-up game dan voucher digital terpercaya di Indonesia. 
              Proses cepat, harga terbaik, dan layanan 24/7.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="#" className="text-muted-foreground hover:text-success transition-colors"><MessageCircle className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-rajdhani font-semibold text-white uppercase tracking-wider mb-4">Layanan</h4>
            <ul className="space-y-2">
              <li><Link to="/" className="text-muted-foreground hover:text-white text-sm transition-colors">Top Up Game</Link></li>
              <li><Link to="/" className="text-muted-foreground hover:text-white text-sm transition-colors">Voucher Digital</Link></li>
              <li><Link to="/track" className="text-muted-foreground hover:text-white text-sm transition-colors">Cek Transaksi</Link></li>
              <li><Link to="/reseller" className="text-muted-foreground hover:text-white text-sm transition-colors">Program Reseller</Link></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-rajdhani font-semibold text-white uppercase tracking-wider mb-4">Informasi</h4>
            <ul className="space-y-2">
              <li><Link to="/page/tentang-kami" className="text-muted-foreground hover:text-white text-sm transition-colors">Tentang Kami</Link></li>
              <li><Link to="/page/kebijakan-privasi" className="text-muted-foreground hover:text-white text-sm transition-colors">Kebijakan Privasi</Link></li>
              <li><Link to="/page/syarat-ketentuan" className="text-muted-foreground hover:text-white text-sm transition-colors">Syarat & Ketentuan</Link></li>
              <li><Link to="/page/hubungi-kami" className="text-muted-foreground hover:text-white text-sm transition-colors">Hubungi Kami</Link></li>
            </ul>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-border mt-8 pt-6">
        </div>

        <div className="border-t border-border mt-6 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 {isReseller ? storeName : 'PT SENTOSA AWAN ABADI'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
