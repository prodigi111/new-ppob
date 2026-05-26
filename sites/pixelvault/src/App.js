import React from 'react';
import axios from 'axios';
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { StoreProvider } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import theme from './theme.config';

// Multi-site identifier — sent on every API call so the backend can pick the
// correct order prefix + callback forwarding rule from site_configs.
axios.defaults.headers.common['X-Site-Id'] = theme.siteId || 'blaze';

// Automatically attach Authorization header from localStorage on every request.
axios.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token');
    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (_) { /* no-op */ }
  return config;
});

// Pages
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import DigiFlazzProduct from './pages/DigiFlazzProduct';
import CmsPage from './pages/CmsPage';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import TrackOrder from './pages/TrackOrder';
import Profile from './pages/Profile';
import Reseller from './pages/Reseller';
import ResellerDashboard from './pages/ResellerDashboard';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <div className="min-h-screen bg-background flex flex-col noise-overlay">
          <BrowserRouter>
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/product/df/:brandSlug" element={<DigiFlazzProduct />} />
                <Route path="/product/:slug" element={<ProductDetail />} />
                <Route path="/page/:slug" element={<CmsPage />} />
                <Route path="/checkout/:orderId" element={<Checkout />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/track" element={<TrackOrder />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/reseller" element={<Reseller />} />
                <Route path="/reseller/dashboard" element={<ResellerDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
              </Routes>
            </main>
            <Footer />
          </BrowserRouter>
          <Toaster position="top-center" richColors />
        </div>
      </StoreProvider>
    </AuthProvider>
  );
}

export default App;
