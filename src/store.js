import { supabase } from './supabase.js';

const STORE_KEY = 'ngopi_store_v3';

// Helper to keep local UI updated while network requests happen
function notifyLocalUpdate() {
  window.dispatchEvent(new CustomEvent('sync_store'));
}

// Global cached state (monolithic format for compatibility with App.jsx)
let memoryStore = {
  session: null,
  history: [],
  payerHistory: {},
  menu: [],
  users: [] // will store { username, pin } objects
};

export function loadStore() {
  return { ...memoryStore }; // return new object reference for React state update
}

// ============================================================================
// SUPABASE SYNC (REALTIME)
// ============================================================================

export async function initSupabaseSync() {
  await fetchFullState();
  
  // Realtime subscription
  supabase.channel('schema-db-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        // Any change in any table -> fetch full state to rebuild view
        fetchFullState();
      }
    )
    .subscribe();
}

async function fetchFullState() {
  const [
    { data: sessions, error: sessionsErr },
    { data: orders, error: ordersErr },
    { data: notifications, error: notifErr },
    { data: menu, error: menuErr },
    { data: payers, error: payersErr },
    { data: historic, error: historicErr },
    { data: users, error: usersErr }
  ] = await Promise.all([
    supabase.from('sessions').select('*'),
    supabase.from('orders').select('*'),
    supabase.from('notifications').select('*'),
    supabase.from('menu_items').select('*'),
    supabase.from('payer_history').select('*'),
    supabase.from('historic_sessions').select('*'),
    supabase.from('users').select('*')
  ]);

  if (sessionsErr) console.error("Supabase Error (Sessions):", sessionsErr);
  if (ordersErr) console.error("Supabase Error (Orders):", ordersErr);

  // Rebuild Menu
  memoryStore.menu = (menu || []).map(m => ({
    id: m.id,
    name: m.name,
    price: m.price,
    emoji: m.emoji
  }));

  // Rebuild Payer History
  memoryStore.payerHistory = {};
  (payers || []).forEach(p => {
    memoryStore.payerHistory[p.username] = p.pay_count;
  });

  // Rebuild Users from dedicated table
  memoryStore.users = (users || []).map(u => ({
    username: u.username,
    pin: u.pin
  }));
  
  // Also track names for quick-selection (extract from history if needed)
  const userSet = new Set((payers || []).map(p => p.username));
  (orders || []).forEach(o => userSet.add(o.username));
  (users || []).forEach(u => userSet.add(u.username));
  // memoryStore.userNames = Array.from(userSet); // simplified: App.jsx uses memoryStore.users usually


  // If session is 'open' and older than 2 hours, force-close it
  const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;
  const rawActive = (sessions || []).sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
  
  if (rawActive && rawActive.status !== 'completed' && rawActive.status !== 'force-closed' && rawActive.started_at) {
    const elapsed = Date.now() - new Date(rawActive.started_at).getTime();
    if (elapsed > SESSION_TIMEOUT_MS) {
      // Calculate debtors before closing
      const sessionOrders = (orders || []).filter(o => o.session_id === rawActive.id);
      const debtors = sessionOrders.filter(o => !o.is_paid && o.username !== rawActive.payer).map(o => o.username);

      supabase.from('sessions').update({
        status: 'force-closed',
        force_closed_by: 'System (Auto-Expire)',
        closed_at: new Date().toISOString(),
        debtors: debtors
      }).eq('id', rawActive.id).then(async () => {
        // Build and save history too
        const fullSession = {
           id: rawActive.id,
           status: 'force-closed',
           startedBy: rawActive.started_by,
           startedAt: rawActive.started_at,
           closedAt: new Date().toISOString(),
           payer: rawActive.payer,
           debtors: debtors,
           orders: sessionOrders.map(o => ({
             username: o.username,
             isPaid: o.is_paid,
             item: { name: o.coffee_name, price: o.coffee_price }
           }))
        };
        await supabase.from('historic_sessions').insert({ id: rawActive.id, data: fullSession });
        fetchFullState();
      });
      memoryStore.session = null;
      notifyLocalUpdate();
      return; 
    }
  }

  const activeSessionRow = rawActive;
  
  if (activeSessionRow) {
    const sessionOrders = (orders || []).filter(o => o.session_id === activeSessionRow.id);
    const sessionNotifs = (notifications || []).filter(n => n.session_id === activeSessionRow.id);
    
    memoryStore.session = {
      id: activeSessionRow.id,
      status: activeSessionRow.status,
      startedBy: activeSessionRow.started_by,
      startedAt: activeSessionRow.started_at,
      closedAt: activeSessionRow.closed_at,
      payer: activeSessionRow.payer,
      companion: activeSessionRow.companion,
      paymentInfo: activeSessionRow.payment_method ? {
        method: activeSessionRow.payment_method,
        bankName: activeSessionRow.bank_name,
        accountNo: activeSessionRow.account_no
      } : null,
      coffeeBought: activeSessionRow.coffee_bought,
      coffeeBoughtAt: activeSessionRow.coffee_bought_at,
      forceClosedBy: activeSessionRow.force_closed_by,
      debtors: activeSessionRow.debtors || [],
      orders: sessionOrders.map(o => ({
        id: o.id,
        username: o.username,
        item: { id: o.coffee_id, name: o.coffee_name, price: o.coffee_price, emoji: o.coffee_emoji || '' },
        isPaid: o.is_paid,
        paidAt: o.paid_at, 
        markedByPayer: o.marked_by_payer,
        paymentProof: o.payment_proof
      })),
      notifications: sessionNotifs.map(n => ({
        id: n.id,
        to: n.target_user,
        type: n.type,
        message: n.message,
        readBy: n.is_read_by || [],
        createdAt: n.created_at
      }))
    };
  } else {
    memoryStore.session = null;
  }

  // Rebuild History
  memoryStore.history = (historic || []).map(h => h.data);

  // Notify UI
  notifyLocalUpdate();
}

// ============================================================================
// APP API ACTIONS -> TO SUPABASE
// ============================================================================

export const api = {
  createSession: async (startedBy) => {
    const id = Date.now().toString();
    const { error } = await supabase.from('sessions').insert({
      id,
      status: 'open',
      started_by: startedBy,
    });
    if (error) {
      console.error("Failed to create session:", error);
      alert("Error membuat sesi: " + error.message);
    }
    // Optimistic
    fetchFullState();
  },

  addOrder: async (sessionId, username, menuItem) => {
    // Upsert equivalent: Delete old order by this user in this session, then insert
    await supabase.from('orders').delete().match({ session_id: sessionId, username });
    await supabase.from('orders').insert({
      session_id: sessionId,
      username,
      coffee_id: menuItem.id,
      coffee_name: menuItem.name,
      coffee_price: menuItem.price
    });
    fetchFullState();
  },

  updateSession: async (sessionId, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.payer !== undefined) payload.payer = updates.payer;
    if (updates.companion !== undefined) payload.companion = updates.companion;
    if (updates.closedAt !== undefined) payload.closed_at = updates.closedAt;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.bankName !== undefined) payload.bank_name = updates.bankName;
    if (updates.accountNo !== undefined) payload.account_no = updates.accountNo;
    if (updates.coffeeBought !== undefined) payload.coffee_bought = updates.coffeeBought;
    if (updates.forceClosedBy !== undefined) payload.force_closed_by = updates.forceClosedBy;
    if (updates.debtors !== undefined) payload.debtors = updates.debtors;
    
    await supabase.from('sessions').update(payload).eq('id', sessionId);
  },

  incrementPayerCount: async (username) => {
    // using an upsert
    const { data: current } = await supabase.from('payer_history').select('pay_count').eq('username', username).single();
    const count = current ? current.pay_count + 1 : 1;
    await supabase.from('payer_history').upsert({ username, pay_count: count });
  },

  markOrderPaid: async (orderId, markedByPayer) => {
    await supabase.from('orders').update({
      is_paid: true,
      marked_by_payer: markedByPayer ? true : false,
      paid_at: new Date().toISOString()
    }).eq('id', orderId);
  },

  uploadProof: async (orderId, proofUrl) => {
    await supabase.from('orders').update({
      payment_proof: proofUrl
    }).eq('id', orderId);
  },

  notify: async (sessionId, targetUser, type, message) => {
    await supabase.from('notifications').insert({
      session_id: sessionId,
      target_user: targetUser,
      type,
      message
    });
  },

  markNotifRead: async (notifId, username) => {
    const { data } = await supabase.from('notifications').select('is_read_by').eq('id', notifId).single();
    if (data) {
      const arr = data.is_read_by || [];
      if (!arr.includes(username)) {
        await supabase.from('notifications').update({
          is_read_by: [...arr, username]
        }).eq('id', notifId);
      }
    }
  },

  saveHistory: async (sessionId, fullSessionData) => {
    await supabase.from('historic_sessions').insert({
      id: sessionId,
      data: fullSessionData
    });
  },

  saveMenu: async (menuItems) => {
    // Delete all and re-insert (simple approach for menu)
    await supabase.from('menu_items').delete().neq('id', 'dummy'); 
    const mapped = menuItems.map(m => ({
      id: m.id,
      name: m.name,
      price: m.price,
      emoji: m.emoji
    }));
    if (mapped.length > 0) {
      await supabase.from('menu_items').insert(mapped);
    }
  },

  // Auth & Profile
  login: async (username, pin) => {
    try {
      // 1. Try to find in memory first (fastest)
      let existing = memoryStore.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      
      // 2. If not in memory (could be the first load or race condition), check the DB directly
      if (!existing) {
        const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
        if (error && error.code === 'PGRST116') {
          // No user found - this is okay, we'll register below
        } else if (error) {
          console.error("Login Check Error:", error);
          if (error.message.includes("Could not find the table")) {
            return { success: false, message: "Hubungi Admin: Tabel 'users' belum dibuat di Supabase." };
          }
          return { success: false, message: "Error DB: " + error.message };
        }
        
        if (data) {
          existing = { username: data.username, pin: data.pin };
          // Sync local memory while we're at it
          memoryStore.users.push(existing);
        }
      }

      if (!existing) {
        // New user or Legacy claim: Register with this PIN
        const { error: insErr } = await supabase.from('users').insert({ username, pin });
        if (insErr) {
           console.error("Registration Error:", insErr);
           return { success: false, message: "Gagal registrasi: " + insErr.message };
        }
        fetchFullState();
        return { success: true, isNew: true };
      } else {
        // Verify PIN
        if (existing.pin === pin) {
          return { success: true, isNew: false };
        } else {
          return { success: false, message: "PIN salah!" };
        }
      }
    } catch (e) {
      console.error(e);
      return { success: false, message: "Terjadi kesalahan sistem." };
    }
  },

  updateProfile: async (oldUsername, newUsername) => {
    // This is a "Deep Rename" operation.
    // 1. Update the base user record (Independent try-catch as it might error if newUsername exists)
    try {
      await supabase.from('users').update({ username: newUsername }).eq('username', oldUsername);
    } catch (e) {
      console.warn("Possible duplicate username when updating users table, skipping base rename.");
    }
    
    // 2. Update payer history
    await supabase.from('payer_history').update({ username: newUsername }).eq('username', oldUsername);
    
    // 3. Update orders (very important for debt tracking)
    await supabase.from('orders').update({ username: newUsername }).eq('username', oldUsername);

    // 4. Update sessions (where they were started_by, payer, or companion)
    await supabase.from('sessions').update({ started_by: newUsername }).eq('started_by', oldUsername);
    await supabase.from('sessions').update({ payer: newUsername }).eq('payer', oldUsername);
    await supabase.from('sessions').update({ companion: newUsername }).eq('companion', oldUsername);

    // 5. Update debtors array & orders JSONB array in sessions
    // Using a simpler fetch + JS filter to avoid 406 errors with complex .or query on JSONB
    const { data: allSessions } = await supabase.from('sessions').select('id, debtors, orders');
    
    if (allSessions) {
      for (const s of allSessions) {
        let changed = false;
        const updates = {};

        if (s.debtors?.includes(oldUsername)) {
          updates.debtors = s.debtors.map(d => (d === oldUsername ? newUsername : d));
          changed = true;
        }

        if (s.orders?.some(o => o.username === oldUsername)) {
          updates.orders = s.orders.map(o => (o.username === oldUsername ? { ...o, username: newUsername } : o));
          changed = true;
        }

        if (changed) {
          await supabase.from('sessions').update(updates).eq('id', s.id);
        }
      }
    }

    fetchFullState();
  },

  resetUserPin: async (username, newPin = '1234') => {
    await supabase.from('users').update({ pin: newPin }).eq('username', username);
    fetchFullState();
  }
};

export function selectRoles(participants, payerHistory) {
  if (participants.length === 0) return { payer: null, companion: null };
  const sorted = [...participants].sort((a, b) => {
    const countA = payerHistory[a] || 0;
    const countB = payerHistory[b] || 0;
    if (countA !== countB) return countA - countB;
    return a.localeCompare(b);
  });
  const payer = sorted[0];
  const remaining = sorted.filter(p => p !== payer);
  const companion = remaining.length > 0 ? remaining[0] : null;
  return { payer, companion };
}
