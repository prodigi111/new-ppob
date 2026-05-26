import { useState, useEffect } from 'react';
import axios from 'axios';
import theme from '../theme.config';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Detect if current site is a reseller subdomain (e.g. ggtopup.<masterDomain>).
 * The master root domain comes from theme.brand.rootDomain (override per site),
 * otherwise we accept any 2-part TLD-like suffix as the root.
 * Returns store config if on a reseller subdomain, null if on main site.
 */
export function useResellerStore() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReseller, setIsReseller] = useState(false);

  useEffect(() => {
    detectStore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detectStore = async () => {
    try {
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      let subdomain = null;

      // Allow each site to declare its own root domain in theme.config.js
      const rootDomain = (theme?.brand?.rootDomain || '').toLowerCase();

      if (parts.length >= 3) {
        const main = parts.slice(-2).join('.');
        if (!rootDomain || main === rootDomain) {
          subdomain = parts[0];
        }
      }

      // Also support ?store=ggtopup for testing across any host
      const params = new URLSearchParams(window.location.search);
      const storeParam = params.get('store');
      if (storeParam) subdomain = storeParam;

      if (!subdomain || subdomain === 'www' || subdomain === 'api') {
        setIsReseller(false);
        setLoading(false);
        return;
      }

      const res = await axios.get(`${API_URL}/api/store/${subdomain}`);
      if (res.data.store) {
        setStore(res.data.store);
        setIsReseller(true);
      }
    } catch {
      setIsReseller(false);
    } finally {
      setLoading(false);
    }
  };

  return { store, loading, isReseller };
}
