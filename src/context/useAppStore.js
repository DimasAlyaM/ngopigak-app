import { create } from 'zustand';

// Helper to load user from localStorage with expiry
const loadInitialUser = () => {
  try {
    const saved = localStorage.getItem('ngopi_current_v2');
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    // Check expiry (7 days)
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem('ngopi_current_v2');
      return null;
    }
    const { expiresAt: _, ...user } = parsed;
    return user;
  } catch {
    localStorage.removeItem('ngopi_current_v2');
    return null;
  }
};

export const useAppStore = create((set, get) => ({
  // Active User State
  currentUser: loadInitialUser(),
  setCurrentUser: (user) => {
    set({ currentUser: user });
    if (user) {
      const SESSION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem('ngopi_current_v2', JSON.stringify({
        ...user,
        expiresAt: Date.now() + SESSION_EXPIRY_MS
      }));
    } else {
      localStorage.removeItem('ngopi_current_v2');
      localStorage.removeItem('ngopi_current_user'); // safety clear
    }
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
