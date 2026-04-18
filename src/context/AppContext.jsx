import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadStore, api, initSupabaseSync } from '../store.js';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [store, setStore] = useState(() => loadStore());
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ngopi_current_v2');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      // Check expiry (7 days)
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem('ngopi_current_v2');
        return null;
      }
      // Return user object without the expiresAt meta field
      const { expiresAt: _, ...user } = parsed;
      return user;
    } catch {
      localStorage.removeItem('ngopi_current_v2');
      return null;
    }
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

  // Persist currentUser to localStorage when it changes (with 7-day expiry)
  useEffect(() => {
    if (currentUser) {
      const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari
      localStorage.setItem('ngopi_current_v2', JSON.stringify({
        ...currentUser,
        expiresAt: Date.now() + SESSION_EXPIRY_MS
      }));
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
