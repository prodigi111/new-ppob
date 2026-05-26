import React, { createContext, useContext } from 'react';
import { useResellerStore } from '../hooks/useResellerStore';

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const { store, loading, isReseller } = useResellerStore();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <StoreContext.Provider value={{ store, isReseller }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  return useContext(StoreContext) || { store: null, isReseller: false };
}
