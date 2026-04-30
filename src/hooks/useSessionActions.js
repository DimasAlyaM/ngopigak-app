import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/useAppStore.js';
import { api, selectRoles } from '../store.js';

export function useSessionActions() {
  const navigate = useNavigate();
  const { currentUser, store, setActiveMenu, setSelectedOrder, setSelectedSession } = useAppStore();

  const startSession = async () => {
    if (store.session && store.session.status !== 'completed' && store.session.status !== 'force-closed') {
      alert('Sudah ada sesi aktif!');
      return;
    }
    await api.createSession(currentUser);
    navigate('/');
  };

  const closeSessionAndSelectRoles = useCallback(async () => {
    if (!store.session || store.session.status !== 'open') return;

    if (store.session.orders.length === 0) {
      await api.updateSession(store.session.id, {
        status: 'force-closed',
        forceClosedBy: 'System (Timeout)',
        closedAt: new Date().toISOString()
      });
      return;
    }

    const participants = [...new Set(store.session.orders.map(o => o.userId).filter(Boolean))];
    if (participants.length < 1) {
      alert("Harus ada pemesan untuk memilih payer!");
      return;
    }

    const lastRoles = store.history.length > 0 ? { payerId: store.history[0].payerId, companionId: store.history[0].companionId } : null;
    
    const statsForSelect = {};
    (store.users || []).forEach(u => {
      const payCount = store.history.filter(s => s.payerId === u.id || s.payer?.toLowerCase() === u.username.toLowerCase()).length;
      const companionCount = store.history.filter(s => s.companionId === u.id || s.companion?.toLowerCase() === u.username.toLowerCase()).length;
      
      statsForSelect[u.id] = { 
        username: u.username,
        payCount: payCount,
        companionCount: companionCount
      };
    });

    const { payerId, companionId } = selectRoles(participants, statsForSelect, lastRoles);

    const payerObj = store.users.find(u => u.id === payerId);
    const companionObj = store.users.find(u => u.id === companionId);

    await api.updateSession(store.session.id, {
      status: 'payment-setup',
      payer: payerObj?.username || null,
      payerId: payerId || null,
      companion: companionObj?.username || null,
      companionId: companionId || null,
      closedAt: new Date().toISOString()
    });

    participants.forEach(p => {
      api.notify(store.session.id, p, 'info', `Sesi ditutup! Pembayar: ${payerObj?.username} | Pendamping: ${companionObj?.username || '-'}`);
    });
    api.notify(store.session.id, payerId, 'info', `Kamu terpilih sebagai Pembayar! Silakan lengkapi info pembayaran.`);
  }, [store]);

  const addOrder = async (selectedCoffeeId) => {
    if (!selectedCoffeeId || !currentUser) return;
    if (!store.session || store.session.status !== 'open') return;

    const menu = store.menu.find(m => m.id === selectedCoffeeId);
    if (!menu) return;

    await api.addOrder(store.session.id, currentUser, menu);
  };

  const confirmBought = async () => {
    if (!store.session) return;
    await api.updateSession(store.session.id, { coffeeBought: true, coffeeBoughtAt: new Date().toISOString() });
    
    if (currentUser.id !== store.session.payerId) {
       await api.notify(store.session.id, store.session.payerId, 'coffee-bought', `${currentUser.username} sudah belikan kopi!`);
    }
    store.session.orders.forEach(o => {
      if (o.userId !== currentUser.id) {
        api.notify(store.session.id, o.userId, 'bought', ` Kopi sudah dibeli oleh ${store.session.payer} dan dalam perjalanan!`);
      }
    });
  };

  const submitPaymentInfo = async (paymentMethod, bankName, accountNo) => {
    if (!paymentMethod || !accountNo) return;
    if (paymentMethod === 'BANK' && !bankName) return;
    if (!store.session) return;
    
    const payerId = store.session.payerId;

    await api.updateSession(store.session.id, {
      status: 'active',
      paymentMethod: paymentMethod,
      bankName: paymentMethod === 'BANK' ? bankName : null,
      accountNo: accountNo
    });
    await api.incrementRoleCount(store.session.payer, 'pay');
    if (store.session.companionId) {
      await api.incrementRoleCount(store.session.companion, 'companion');
    }

    store.session.orders.forEach(o => {
      if (o.userId !== payerId) {
        api.notify(store.session.id, o.userId, 'payment',
          ` Info Transfer: ${paymentMethod}${paymentMethod === 'BANK' ? ` (${bankName})` : ''} – ${accountNo} a.n. ${store.session.payer}. Total kamu: ${o.item.price}`
        );
      }
    });
  };

  const submitProof = async (userId, proofUrl) => {
    if (!store.session) return;
    const order = store.session.orders.find(o => o.userId === userId);
    if (!order) return;

    await api.updateOrder(order.id, { paymentProof: proofUrl });
    api.notify(store.session.id, store.session.payerId, 'payment', `${currentUser.username} telah mengirimkan bukti pembayaran.`);
    alert('Bukti pembayaran terkirim!');
  };

  const markMyPayment = async (userId) => {
    if (!store.session) return;
    const order = store.session.orders.find(o => o.userId === userId);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, false);
      api.notify(store.session.id, store.session.payerId, 'payment', `${currentUser.username} sudah bayar (menunggu verifikasi).`);
    }
  };

  const markPaidByPayer = async (userId) => {
    if (!store.session) return;
    const order = store.session.orders.find(o => o.userId === userId);
    if (order && !order.isPaid) {
      await api.markOrderPaid(order.id, true);
      api.notify(store.session.id, userId, 'payment', `${store.session.payer} mengonfirmasi pembayaranmu.`);
    }
  };

  const remindAll = async () => {
    if (!store.session) return;
    store.session.orders.forEach(o => {
      if (o.userId !== store.session.payerId && !o.isPaid) {
        api.notify(store.session.id, o.userId, 'payment', `Tagihan ngopi! Jangan lupa bayar ke ${store.session.payer} ya bro.`);
      }
    });
    alert('Notifikasi tagihan dikirim!');
  };

  const forceClose = async (onCloseCallback) => {
    if (!store.session) {
      if (onCloseCallback) onCloseCallback();
      return;
    }

    if (onCloseCallback) onCloseCallback();
    navigate('/');
    setActiveMenu(null);

    try {
      const debtors = store.session.orders
        .filter(o => !o.isPaid && o.userId !== store.session.payerId)
        .map(o => o.username);
      
      const debtorIds = store.session.orders
        .filter(o => !o.isPaid && o.userId !== store.session.payerId)
        .map(o => o.userId);

      if (store.session.payer) await api.incrementRoleCount(store.session.payer, 'pay');
      if (store.session.companion) {
        await api.incrementRoleCount(store.session.companion, 'companion');
      }

      // FETCH LATEST FROM DB to avoid stale data loss (e.g. payment info)
      const latest = await api.getSessionById(store.session.id);
      
      // Prioritize database info, then current store info, then fallback
      const paymentInfo = (latest?.payment_method) ? {
        method: latest.payment_method,
        bankName: latest.bank_name,
        accountNo: latest.account_no
      } : (store.session.paymentInfo || null);

      const fullSessionData = {
        id: store.session.id,
        status: 'force-closed',
        startedBy: store.session.startedBy,
        startedById: store.session.startedById,
        startedAt: store.session.startedAt,
        closedAt: new Date().toISOString(),
        payer: store.session.payer,
        payerId: store.session.payerId,
        companion: store.session.companion,
        companionId: store.session.companionId,
        paymentInfo: paymentInfo,
        debtors,
        debtorIds,
        orders: store.session.orders.map(o => ({
          username: o.username,
          userId: o.userId,
          isPaid: o.isPaid,
          item: o.item,
          paymentProof: o.paymentProof
        }))
      };

      await api.saveHistory(store.session.id, fullSessionData);
      await api.updateSession(store.session.id, { 
        status: 'force-closed', 
        forceClosedBy: currentUser?.username,
        closedAt: new Date().toISOString(),
        debtors,
        debtorIds
      });
      await api.deleteActiveSession(store.session.id);
      
      store.session.orders.forEach(o => {
        api.notify(store.session.id, o.userId, 'info', `Sesi ditutup paksa oleh ${currentUser?.username}.`);
      });

    } catch (err) {
      console.error(err);
      alert("Gagal Force Close: " + err.message);
    }
  };

  const checkSessionComplete = useCallback(async () => {
    if (!store.session || store.session.status !== 'active') return;
    
    // ONLY the Payer should finalize the session to avoid race conditions/data loss
    if (currentUser?.id !== store.session.payerId) return;

    const allPaid = store.session.orders.every(o => o.isPaid || o.userId === store.session.payerId);
    if (allPaid && store.session.coffeeBought) {
      const debtors = store.session.orders
        .filter(o => !o.isPaid && o.userId !== store.session.payerId)
        .map(o => o.username);
      
      const debtorIds = store.session.orders
        .filter(o => !o.isPaid && o.userId !== store.session.payerId)
        .map(o => o.userId);

      const latest = await api.getSessionById(store.session.id);
      const paymentInfo = latest?.payment_method ? {
        method: latest.payment_method,
        bankName: latest.bank_name,
        accountNo: latest.account_no
      } : store.session.paymentInfo;

      const fullSessionData = {
        id: store.session.id,
        status: 'completed',
        startedBy: store.session.startedBy,
        startedById: store.session.startedById,
        startedAt: store.session.startedAt,
        closedAt: new Date().toISOString(),
        payer: store.session.payer,
        payerId: store.session.payerId,
        companion: store.session.companion,
        companionId: store.session.companionId,
        paymentInfo,
        debtors,
        debtorIds,
        orders: store.session.orders.map(o => ({
          username: o.username,
          userId: o.userId,
          isPaid: o.isPaid,
          item: o.item,
          paymentProof: o.paymentProof
        }))
      };

      await api.saveHistory(store.session.id, fullSessionData);
      
      // Notify all
      store.session.orders.forEach(o => {
        api.notify(store.session.id, o.userId, 'info', `Sesi selesai! Semua tagihan lunas. ✨`);
      });

      await api.deleteActiveSession(store.session.id);
      
      setActiveMenu(null);
      navigate('/');
    }
  }, [store, navigate, setActiveMenu]);

  const handleNotifAction = (n) => {
    const targetSessionId = n.sessionId || n.session_id;

    if (store.session && store.session.id === targetSessionId) {
      const isPaymentNotif = n.type === 'payment' || n.type === 'debt';
      if (isPaymentNotif) {
        const myActiveOrder = store.session.orders.find(o => o.userId === currentUser?.id);
        if (myActiveOrder) {
          setSelectedOrder({
            ...myActiveOrder,
            sessionDate: store.session.startedAt,
            payer: store.session.payer,
            payerId: store.session.payerId,
            isPaid: myActiveOrder.isPaid || false,
            sessionId: store.session.id,
            isLive: true
          });
          navigate('/order/' + store.session.id);
          return;
        }
      }
      navigate('/');
      return;
    }

    const histSession = store.history.find(h => h.id === targetSessionId);
    if (histSession) {
      const myOrder = histSession.orders?.find(o => o.userId === currentUser.id);
      if (myOrder) {
        setSelectedOrder({
          ...myOrder,
          sessionDate: histSession.startedAt,
          payer: histSession.payer,
          payerId: histSession.payerId,
          isPaid: !(histSession.debtorIds || []).includes(currentUser.id),
          sessionId: histSession.id
        });
        navigate('/order/' + histSession.id);
      } else {
        setSelectedSession(histSession);
        navigate('/history/' + histSession.id);
      }
      return;
    }

    if (n.message && n.message.toLowerCase().includes('sesi')) {
      if (store.session && store.session.status !== 'completed' && store.session.status !== 'force-closed') navigate('/');
      else navigate('/history');
      return;
    }

    navigate('/history');
  };

  return {
    startSession,
    closeSessionAndSelectRoles,
    addOrder,
    confirmBought,
    submitPaymentInfo,
    submitProof,
    markMyPayment,
    markPaidByPayer,
    remindAll,
    forceClose,
    checkSessionComplete,
    handleNotifAction
  };
}
