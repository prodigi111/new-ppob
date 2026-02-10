import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Instagram, Twitter } from 'lucide-react';
import BlazeLogo from '../assets/logo-blaze.svg';

export const Footer = () => {
  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img 
                src={BlazeLogo} 
                alt="Blaze Store" 
                className="h-10 w-auto object-contain"
              />
            </Link>
            <p className="text-muted-foreground text-sm max-w-md">
              Platform top-up game dan voucher digital terpercaya di Indonesia. 
              Proses cepat, harga terbaik, dan layanan 24/7.
            </p>
            <div className="flex items-center gap-4 mt-4">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-muted-foreground hover:text-success transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-rajdhani font-semibold text-white uppercase tracking-wider mb-4">
              Layanan
            </h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Top Up Game
                </Link>
              </li>
              <li>
                <Link to="/" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Voucher Digital
                </Link>
              </li>
              <li>
                <Link to="/track" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Cek Transaksi
                </Link>
              </li>
              <li>
                <Link to="/reseller" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Program Reseller
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-rajdhani font-semibold text-white uppercase tracking-wider mb-4">
              Informasi
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Tentang Kami
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Kebijakan Privasi
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Syarat & Ketentuan
                </a>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-white text-sm transition-colors">
                  Hubungi Kami
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2026 VoucherVerse. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/QRIS_logo.svg/200px-QRIS_logo.svg.png" 
              alt="QRIS" 
              className="h-6 opacity-50"
            />
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Central_Asia.svg/200px-Bank_Central_Asia.svg.png" 
              alt="BCA" 
              className="h-6 opacity-50"
            />
          </div>
        </div>
      </div>
    </footer>
  );
};
