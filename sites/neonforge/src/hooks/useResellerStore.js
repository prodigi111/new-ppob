import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Detect if current site is a reseller subdomain (e.g. ggtopup.blazestore.id)
 * Returns store config if on a reseller subdomain, null if on main site.
 */
export function useResellerStore() {
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isReseller, setIsReseller] = useState(false);

  useEffect(() => {
    detectStore();
  }, []);

  const detectStore = async () => {
    try {
      const hostname = window.location.hostname;

      // Extract subdomain: ggtopup.blazestore.id → ggtopup
      const parts = hostname.split('.');
      let subdomain = null;

      if (parts.length >= 3) {
        // e.g. ggtopup.blazestore.id
        const main = parts.slice(-2).join('.');
        if (main === 'blazestore.id') {
          subdomain = parts[0];
        }
      }

      // Also support ?store=ggtopup for testing
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
