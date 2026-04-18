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
  users: [], // will store { username, pin } objects
  adminPin: null // global admin pin for menu access
};

export function loadStore() {
  return { ...memoryStore }; // return new object reference for React state update
}

// ============================================================================
// SUPABASE SYNC (REALTIME)
// ============================================================================

let syncChannel = null;

export async function initSupabaseSync() {
  await fetchFullState();
  
  // Cleanup existing channel if re-initializing (HMR fallback)
  if (syncChannel) {
    await supabase.removeChannel(syncChannel);
  }

  // Realtime subscription
  syncChannel = supabase.channel('schema-db-changes')
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
  try {
    const [
      { data: sessions, error: sessionsErr },
      { data: orders, error: ordersErr },
      { data: notifications, error: notifErr },
      { data: menu, error: menuErr },
      { data: payers, error: payersErr },
      { data: historic, error: historicErr },
      { data: users, error: usersErr },
      { data: settings, error: settingsErr }
    ] = await Promise.all([
      supabase.from('sessions').select('*'),
      supabase.from('orders').select('*'),
      supabase.from('notifications').select('*'),
      supabase.from('menu_items').select('*'),
      supabase.from('payer_history').select('*'),
      supabase.from('historic_sessions').select('*'),
      supabase.from('users').select('*'),
      supabase.from('app_settings').select('*')
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

    // Rebuild Users from dedicated table
    memoryStore.users = (users || []).map(u => ({
      id: u.id,
      username: u.username,
      pin: u.pin
    }));

    // Rebuild Payer History (store as array of objects)
    memoryStore.payerHistory = payers || [];

    // Rebuild Admin Pin
    const adminPinRow = (settings || []).find(s => s.key === 'admin_pin');
    memoryStore.adminPin = adminPinRow ? adminPinRow.value : null;
    
    // Also track names for quick-selection (extract from history if needed)
    const userSet = new Set();
    (payers || []).forEach(p => userSet.add(p.username.toLowerCase()));
    (orders || []).forEach(o => userSet.add(o.username.toLowerCase()));
    (users || []).forEach(u => userSet.add(u.username.toLowerCase()));

    // If session is 'open' and older than 2 hours, force-close it
    const SESSION_TIMEOUT_MS = 2 * 60 * 60 * 1000;
    // Only consider sessions that are NOT completed or force-closed
    const activeCandidates = (sessions || []).filter(s => ['open', 'active', 'payment-setup'].includes(s.status));
    const rawActive = activeCandidates.sort((a, b) => new Date(b.started_at) - new Date(a.started_at))[0];
    
    if (rawActive && rawActive.started_at) {
      const elapsed = Date.now() - new Date(rawActive.started_at).getTime();
      if (elapsed > SESSION_TIMEOUT_MS) {
        // Calculate debtors before closing
        const sessionOrders = (orders || []).filter(o => o.session_id === rawActive.id);
        const debtors = sessionOrders
          .filter(o => !o.is_paid && o.user_id !== rawActive.payer_id)
          .map(o => o.username);
        
        const debtorIds = sessionOrders
          .filter(o => !o.is_paid && o.user_id !== rawActive.payer_id)
          .map(o => o.user_id);

        supabase.from('sessions').update({
          status: 'force-closed',
          force_closed_by: 'System (Auto-Expire)',
          closed_at: new Date().toISOString(),
          debtors: debtors,
          debtors_ids: debtorIds
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
              userId: o.user_id,
              item: { id: o.coffee_id, name: o.coffee_name, price: o.coffee_price, emoji: o.coffee_emoji || '☕' }
            }))
          };
          await supabase.from('historic_sessions').insert({ id: rawActive.id, data: fullSession });
          // After moving to history, remove from active sessions table
          await supabase.from('sessions').delete().eq('id', rawActive.id);
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
        startedById: activeSessionRow.started_by_id,
        startedAt: activeSessionRow.started_at,
        closedAt: activeSessionRow.closed_at,
        payer: activeSessionRow.payer,
        payerId: activeSessionRow.payer_id,
        companion: activeSessionRow.companion,
        companionId: activeSessionRow.companion_id,
        paymentInfo: activeSessionRow.payment_method ? {
          method: activeSessionRow.payment_method,
          bankName: activeSessionRow.bank_name,
          accountNo: activeSessionRow.account_no
        } : null,
        coffeeBought: activeSessionRow.coffee_bought,
        coffeeBoughtAt: activeSessionRow.coffee_bought_at,
        forceClosedBy: activeSessionRow.force_closed_by,
        debtors: activeSessionRow.debtors || [],
        debtorIds: activeSessionRow.debtors_ids || [], // Assuming it exists or mapping it manually
        orders: sessionOrders.map(o => ({
          id: o.id,
          username: o.username,
          userId: o.user_id,
          item: { id: o.coffee_id, name: o.coffee_name, price: o.coffee_price, emoji: o.coffee_emoji || '' },
          isPaid: o.is_paid,
          paidAt: o.paid_at, 
          markedByPayer: o.marked_by_payer,
          paymentProof: o.payment_proof
        })),
        notifications: sessionNotifs.map(n => ({
          id: n.id,
          to: n.target_user,
          toId: n.target_id,
          type: n.type,
          message: n.message,
          sessionId: n.session_id,
          readBy: n.is_read_by || [],
          createdAt: n.created_at
        }))
      };
    } else {
      memoryStore.session = null;
    }

    // Rebuild History with safety check for null data
    memoryStore.history = (historic || []).filter(h => h && h.data).map(h => h.data);

    // Notify UI
    notifyLocalUpdate();
  } catch (err) {
    console.error("Critical error in fetchFullState:", err);
  }
}

// ============================================================================
// APP API ACTIONS -> TO SUPABASE
// ============================================================================

export const api = {
  createSession: async (userObj) => {
    try {
      const id = Date.now().toString();
      const { error } = await supabase.from('sessions').insert({
        id,
        status: 'open',
        started_by: userObj.username,
        started_by_id: userObj.id
      });
      if (error) throw error;
      fetchFullState();
    } catch (err) {
      console.error("Failed to create session:", err);
      alert("Error membuat sesi: " + err.message);
    }
  },

  addOrder: async (sessionId, userObj, menuItem) => {
    try {
      // Upsert equivalent: Delete old order by this user in this session, then insert
      await supabase.from('orders').delete().match({ session_id: sessionId, user_id: userObj.id });
      await supabase.from('orders').insert({
        session_id: sessionId,
        username: userObj.username,
        user_id: userObj.id,
        coffee_id: menuItem.id,
        coffee_name: menuItem.name,
        coffee_price: menuItem.price
      });
      fetchFullState();
    } catch (err) {
      console.error("Failed to add order:", err);
      alert("Error menambah pesanan: " + err.message);
    }
  },

  updateSession: async (sessionId, updates) => {
    const payload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.payer !== undefined) payload.payer = updates.payer;
    if (updates.payerId !== undefined) payload.payer_id = updates.payerId;
    if (updates.companion !== undefined) payload.companion = updates.companion;
    if (updates.companionId !== undefined) payload.companion_id = updates.companionId;
    if (updates.closedAt !== undefined) payload.closed_at = updates.closedAt;
    if (updates.paymentMethod !== undefined) payload.payment_method = updates.paymentMethod;
    if (updates.bankName !== undefined) payload.bank_name = updates.bankName;
    if (updates.accountNo !== undefined) payload.account_no = updates.accountNo;
    if (updates.coffeeBought !== undefined) payload.coffee_bought = updates.coffeeBought;
    if (updates.forceClosedBy !== undefined) payload.force_closed_by = updates.forceClosedBy;
    if (updates.debtors !== undefined) payload.debtors = updates.debtors;
    if (updates.debtorsIds !== undefined) payload.debtors_ids = updates.debtorsIds; // Handle if schema allows
    
    await supabase.from('sessions').update(payload).eq('id', sessionId);
    await fetchFullState();
  },

  incrementRoleCount: async (userId, role = 'pay') => {
    try {
      const column = role === 'pay' ? 'pay_count' : 'companion_count';
      // Find row by user_id
      const { data: current } = await supabase.from('payer_history').select('*').eq('user_id', userId).single();
      
      const updates = { user_id: userId };
      if (role === 'pay') {
        updates.pay_count = current ? (current.pay_count || 0) + 1 : 1;
        if (current) updates.companion_count = current.companion_count || 0;
      } else {
        updates.companion_count = current ? (current.companion_count || 0) + 1 : 1;
        if (current) updates.pay_count = current.pay_count || 0;
      }

      const { error } = await supabase.from('payer_history').upsert(updates);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to increment role count:", err);
    }
  },

  markOrderPaid: async (orderId, markedByPayer) => {
    await supabase.from('orders').update({
      is_paid: true,
      marked_by_payer: markedByPayer ? true : false,
      paid_at: new Date().toISOString()
    }).eq('id', orderId);
    await fetchFullState();
  },

  updateOrder: async (orderId, updates) => {
    // Map cammelCase to snake_case if necessary
    const payload = {};
    if (updates.isPaid !== undefined) payload.is_paid = updates.isPaid;
    if (updates.paymentProof !== undefined) payload.payment_proof = updates.paymentProof;
    if (updates.markedByPayer !== undefined) payload.marked_by_payer = updates.markedByPayer;
    if (updates.paidAt !== undefined) payload.paid_at = updates.paidAt;
    
    await supabase.from('orders').update(payload).eq('id', orderId);
    fetchFullState();
  },

  notify: async (sessionId, target, type, message) => {
    try {
      let targetId, targetUser;
      if (typeof target === 'object' && target !== null) {
        targetId = target.id;
        targetUser = target.username;
      } else {
        targetId = target;
        const u = memoryStore.users.find(user => user.id === targetId);
        targetUser = u ? u.username : 'Unknown';
      }

      await supabase.from('notifications').insert({
        session_id: sessionId,
        target_user: targetUser,
        target_id: targetId,
        type,
        message
      });
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
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
      const typedName = username.trim();
      // Case-insensitive search using .ilike
      const { data: matchedUser, error: fetchErr } = await supabase
        .from('users')
        .select('*')
        .ilike('username', typedName)
        .single();

      if (fetchErr && fetchErr.code === 'PGRST116') {
        // No user found -> Register new
        const { data: newUser, error: insErr } = await supabase
          .from('users')
          .insert({ username: typedName, pin })
          .select()
          .single();

        if (insErr) {
           console.error("Registration Error:", insErr);
           return { success: false, message: "Gagal registrasi: " + insErr.message };
        }
        fetchFullState();
        return { success: true, isNew: true, user: { id: newUser.id, username: newUser.username } };
      } else if (fetchErr) {
        console.error("Login Check Error:", fetchErr);
        return { success: false, message: "Error DB: " + fetchErr.message };
      }
      
      if (matchedUser) {
        if (matchedUser.pin === pin) {
          return { success: true, isNew: false, user: { id: matchedUser.id, username: matchedUser.username } };
        } else {
          return { success: false, message: "PIN salah!" };
        }
      }
      return { success: false, message: "Terjadi kesalahan sistem." };
    } catch (e) {
      console.error(e);
      return { success: false, message: "Terjadi kesalahan sistem." };
    }
  },

  updateProfile: async (userId, newName) => {
    try {
      // 1. Update the display name in the users table
      const { error: userErr } = await supabase.from('users').update({ username: newName }).eq('id', userId);
      if (userErr) throw userErr;

      // 2. We can also update it in active sessions/orders so the UI updates immediately
      await supabase.from('sessions').update({ started_by: newName }).eq('started_by_id', userId);
      await supabase.from('sessions').update({ payer: newName }).eq('payer_id', userId);
      await supabase.from('sessions').update({ companion: newName }).eq('companion_id', userId);
      await supabase.from('orders').update({ username: newName }).eq('user_id', userId);
      await supabase.from('notifications').update({ target_user: newName }).eq('target_id', userId);

      // 3. For History (historic_sessions), it's stored in JSON. 
      // We'll let it be for now to avoid expensive full-history scans, 
      // or implement a background cleanup if needed.
      
      await fetchFullState();
    } catch (err) {
      console.error("Update profile failed:", err);
      throw err;
    }
  },

  resetUserPin: async (userId, newPin = '1234') => {
    await supabase.from('users').update({ pin: newPin }).eq('id', userId);
    fetchFullState();
  },

  updateHistoricalOrder: async (sessionId, userId, updates) => {
    const { data: h, error: fetchErr } = await supabase.from('historic_sessions').select('data').eq('id', sessionId).single();
    if (fetchErr || !h || !h.data) {
      console.error("Failed to fetch historic session:", fetchErr);
      return;
    }

    const d = { ...h.data };
    let changed = false;

    const orderIndex = d.orders.findIndex(o => o.userId === userId || (o.username || '').toLowerCase() === userId);
    if (orderIndex !== -1) {
      d.orders[orderIndex] = { ...d.orders[orderIndex], ...updates };
      
      if (updates.isPaid) {
        // Remove from debtorIds
        d.debtorIds = (d.debtorIds || []).filter(id => id !== userId);
        // Legacy cleanup
        if (d.debtors) {
          const uName = d.orders[orderIndex].username;
          d.debtors = d.debtors.filter(u => (u || '').toLowerCase() !== (uName || '').toLowerCase());
        }
      } else {
        // Add back to debtorIds if not already there AND not the payer
        const isNotPayer = userId !== d.payerId;
        if (isNotPayer && !d.debtorIds?.includes(userId)) {
           d.debtorIds = [...(d.debtorIds || []), userId];
        }
      }
      changed = true;
    }

    if (changed) {
      await supabase.from('historic_sessions').update({ data: d }).eq('id', sessionId);
      fetchFullState();
    }
  },

  // Single upload function used by both historical and active sessions
  uploadProof: async (orderIdOrFile, proofUrlOrUndefined) => {
    // Legacy support for (orderId, url)
    if (typeof orderIdOrFile === 'string' && typeof proofUrlOrUndefined === 'string') {
      await supabase.from('orders').update({
        payment_proof: proofUrlOrUndefined
      }).eq('id', orderIdOrFile);
      return;
    }

    // New support for (file)
    const file = orderIdOrFile;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading proof:', error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  saveAdminPin: async (newPin) => {
    await supabase.from('app_settings').upsert({ key: 'admin_pin', value: newPin });
    fetchFullState();
  },

  deleteHistory: async (sessionId) => {
    await supabase.from('historic_sessions').delete().eq('id', sessionId);
    fetchFullState();
  },

  deleteActiveSession: async (sessionId) => {
    try {
      console.log("Deleting session:", sessionId);
      // Orders will be deleted automatically due to ON DELETE CASCADE in schema
      const { error: sessionError } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (sessionError) throw sessionError;
      
      // Cleanup notifications for this session manually
      const { error: notifError } = await supabase.from('notifications').delete().eq('session_id', sessionId);
      if (notifError) throw notifError;
      
      await fetchFullState();
      return { success: true };
    } catch (err) {
      console.error("Failed to delete active session:", err);
      alert("Gagal menghapus sesi: " + err.message);
      return { success: false, error: err };
    }
  },

  deleteAllNotifications: async () => {
    // Delete all from notifications table
    await supabase.from('notifications').delete().neq('id', 0);
    fetchFullState();
  }
};

export function selectRoles(participants, payerHistory, lastRoles = null) {
  if (participants.length === 0) return { payerId: null, companionId: null };
  
  // Rule: Last session's payer and companion shouldn't be picked if others are available
  const excludeSet = new Set();
  if (lastRoles) {
    if (lastRoles.payerId) excludeSet.add(lastRoles.payerId);
    if (lastRoles.companionId) excludeSet.add(lastRoles.companionId);
  }

  const primaryPool = participants.filter(p => !excludeSet.has(p));

  // If primaryPool is empty (e.g., only 2 people total and they were both roles last time), 
  // we must fall back to the participants
  const finalCandidates = primaryPool.length > 0 ? primaryPool : participants;

  // 1. SELECT PAYER (Based on least payCount with random tie-break)
  // First shuffle to ensure fairness among equal counts
  const shuffledPayers = [...finalCandidates].sort(() => Math.random() - 0.5);
  const sortedPayers = shuffledPayers.sort((a, b) => {
    const countA = payerHistory[a]?.payCount || 0;
    const countB = payerHistory[b]?.payCount || 0;
    return countA - countB;
  });
  
  const payerId = sortedPayers[0];
  
  // 2. SELECT COMPANION (Based on least companionCount with random tie-break)
  const companionCandidates = participants.filter(p => p !== payerId);
  const primaryCompanionPool = companionCandidates.filter(p => !excludeSet.has(p));
  const finalCompanionCandidates = primaryCompanionPool.length > 0 ? primaryCompanionPool : companionCandidates;

  const shuffledCompanions = [...finalCompanionCandidates].sort(() => Math.random() - 0.5);
  const sortedCompanions = shuffledCompanions.sort((a, b) => {
    const countA = payerHistory[a]?.companionCount || 0;
    const countB = payerHistory[b]?.companionCount || 0;
    return countA - countB;
  });

  const companionId = sortedCompanions.length > 0 ? sortedCompanions[0] : null;
  
  return { payerId, companionId };
}
