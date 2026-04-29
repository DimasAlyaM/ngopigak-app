import { create } from 'zustand';

// Helper to load user from localStorage with expiry
const loadInitialUser = () => {
  try {
    const saved = localStorage.getItem('ngopi_current_v2');
    if (!saved) return null;
    const user = JSON.parse(saved);
    
    // Check 30-minute inactivity
    const lastActivity = localStorage.getItem('ngopi_last_activity');
    const INACTIVITY_LIMIT = 30 * 60 * 1000;
    
    if (lastActivity && Date.now() - parseInt(lastActivity) > INACTIVITY_LIMIT) {
      localStorage.removeItem('ngopi_current_v2');
      localStorage.removeItem('ngopi_last_activity');
      return null;
    }
    
    return user;
  } catch {
    localStorage.removeItem('ngopi_current_v2');
    return null;
  }
};

export const useAppStore = create((set) => ({
  // Active User State
  currentUser: loadInitialUser(),
  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      localStorage.setItem('ngopi_current_v2', JSON.stringify(user));
      localStorage.setItem('ngopi_last_activity', Date.now().toString());
    } else {
      localStorage.removeItem('ngopi_current_v2');
      localStorage.removeItem('ngopi_last_activity');
      localStorage.removeItem('ngopi_current_user'); // safety clear
    }
  },

  updateActivity: () => {
    localStorage.setItem('ngopi_last_activity', Date.now().toString());
  },

  // UI State
  isInitialized: false, // Wait until first Supabase sync is done
  activeMenu: null,
  selectedOrder: null,
  selectedSession: null,

  setActiveMenu: (val) => set({ activeMenu: val }),
  setSelectedOrder: (val) => set({ selectedOrder: val }),
  setSelectedSession: (val) => set({ selectedSession: val }),

  // Monolithic store (mirroring the old memoryStore shape)
  store: {
    session: null,
    history: [],
    payerHistory: {},
    menu: [],
    users: [],
    adminPin: null
  },

  // Action to sync from Supabase
  setStoreParam: (updates) => set((state) => ({ store: { ...state.store, ...updates }, isInitialized: true })),
}));
