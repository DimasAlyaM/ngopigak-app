import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadStore, api, initSupabaseSync } from '../store.js';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [store, setStore] = useState(() => loadStore());
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('ngopi_current_v2');
    return saved ? JSON.parse(saved) : null;
  });

  const refreshStore = useCallback(() => {
    try {
      setStore(loadStore());
    } catch (err) {
      console.error("Store refresh failed:", err);
    }
  }, []);

  useEffect(() => {
    // Initialize Supabase sync
    initSupabaseSync().catch(err => {
      console.error("Supabase initialization error:", err);
    });

    const handler = () => refreshStore();
    window.addEventListener('sync_store', handler);
    
    // Poll every 3 seconds for same-tab fallback or multi-tab consistency
    const poll = setInterval(refreshStore, 3000);

    return () => {
      window.removeEventListener('sync_store', handler);
      clearInterval(poll);
    };
  }, [refreshStore]);

  // Persist currentUser to localStorage when it changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('ngopi_current_v2', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('ngopi_current_v2');
      localStorage.removeItem('ngopi_current_user'); // Cleanup old format
    }
  }, [currentUser]);

  const value = {
    store,
    setStore,
    currentUser,
    setCurrentUser,
    api,
    refreshStore
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
