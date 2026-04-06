const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

code = code.replace(
  "import { loadStore, saveStore, createSession, selectRoles } from './store.js';",
  "import { loadStore, api, initSupabaseSync, selectRoles } from './store.js';"
);

code = code.replace(
  "  useEffect(() => {",
  "  useEffect(() => {\n    initSupabaseSync();"
);

code = code.replace(
  /const startSession = \(\) => {[\s\S]*?setView\('session'\);\n  };/,
  `const startSession = async () => {
    const s = loadStore();
    if (s.session && s.session.status !== 'completed' && s.session.status !== 'force-closed') {
      alert('Sudah ada sesi aktif!'); return;
    }
    await api.createSession(currentUser);
    setView('session');
  };`
);

code = code.replace(
  /const addOrder = \(e\) => {[\s\S]*?setSelectedCoffeeId\(''\);\n  };/,
  `const addOrder = async (e) => {
    e.preventDefault();
    if (!selectedCoffeeId || !currentUser) return;
    const s = loadStore();
    if (!s.session || s.session.status !== 'open') return;
    const menu = s.menu.find(m => m.id === selectedCoffeeId);
    if (!menu) return;
    
    await api.addOrder(s.session.id, currentUser, menu);
    setSelectedCoffeeId('');
  };`
);

code = code.replace(
  /const closeSessionAndSelectRoles = \(\) => {[\s\S]*?refreshStore\(\);\n  };/,
  `const closeSessionAndSelectRoles = async () => {
    const s = loadStore();
    if (!s.session || s.session.status !== 'open' || s.session.orders.length === 0) return;

    const participants = [...new Set(s.session.orders.map(o => o.username))];
    const { payer, companion } = selectRoles(participants, s.payerHistory);
    
    await api.updateSession(s.session.id, {
      status: 'payment-setup',
      payer, companion, closedAt: new Date().toISOString()
    });

    participants.forEach(p => {
      api.notify(s.session.id, p, 'info', \`Sesi ditutup! Pembayar: \${payer} | Pendamping: \${companion || '-'}\`);
    });
    api.notify(s.session.id, payer, 'info', 'Kamu terpilih sebagai Pembayar! Silakan lengkapi info pembayaran.');
  };`
);

code = code.replace(
  /const submitPaymentInfo = \(e\) => {[\s\S]*?setAccountNo\(''\);\n  };/,
  `const submitPaymentInfo = async (e) => {
    e.preventDefault();
    if (!paymentMethod || !accountNo) return;
    if (paymentMethod === 'BANK' && !bankName) return;

    const s = loadStore();
    if (!s.session) return;
    const payer = s.session.payer;

    await api.updateSession(s.session.id, {
      status: 'active', paymentMethod, bankName, accountNo
    });
    await api.incrementPayerCount(payer);

    s.session.orders.forEach(o => {
      if (o.username !== payer) {
        api.notify(s.session.id, o.username, 'payment',
          \`💳 Info Transfer: \${paymentMethod}\${paymentMethod === 'BANK' ? \` (\${bankName})\` : ''} – \${accountNo} a.n. \${payer}. Total kamu: Rp \${o.item.price}\`
        );
      }
    });

    setPaymentMethod(''); setBankName(''); setAccountNo('');
  };`
);

code = code.replace(
  /const markPaid = \(e, orderId\) => {[\s\S]*?refreshStore\(\);\n  };/,
  `const markPaid = async (e, orderId) => {
    e.stopPropagation();
    const s = loadStore();
    const myRole = s.session.payer === currentUser ? 'payer' : s.session.companion === currentUser ? 'companion' : 'penitip';
    await api.markOrderPaid(orderId, myRole === 'payer');
  };`
);

code = code.replace(
  /const confirmCoffeeBought = \(\) => {[\s\S]*?}\);/,
  `const confirmCoffeeBought = () => {
    const s = loadStore();
    setDialog({
      title: 'Kopi Sudah Dibeli?', message: 'Hanya tandai ini jika kamu (pembayar) sudah memastikan pesanan dibeli.',
      confirmText: 'Ya, Sudah Dibeli',
      onConfirm: async () => {
        await api.updateSession(s.session.id, { coffeeBought: true });
        s.session.orders.forEach(o => {
          if (o.username !== currentUser) {
            api.notify(s.session.id, o.username, 'bought', 'Pembayar mengkonfirmasi kopi sedang jalan/sudah dibeli!');
          }
        });
        setDialog(null);
      }
    });`
);

code = code.replace(
  /const markSessionDone = \(\) => {[\s\S]*?refreshStore\(\);\n  };/,
  `const markSessionDone = async () => {
    const s = loadStore();
    await api.updateSession(s.session.id, { status: 'completed' });
    const full = loadStore().session;
    await api.saveHistory(s.session.id, full);
    s.session.orders.forEach(o => {
      api.notify(s.session.id, o.username, 'done', 'Sesi ditutup dengan sukses. Kopi selamat dinikmati!');
    });
  };`
);

code = code.replace(
  /const forceCloseSession = \(\) => {[\s\S]*?}\);/,
  `const forceCloseSession = () => {
    const s = loadStore();
    const debtors = s.session.orders.filter(o => !o.isPaid).map(o => o.username);
    setDialog({
      title: 'Tutup Paksa Sesi?', message: 'Masih ada yang belum bayar. Mereka akan dicatat sebagai hutang.',
      confirmText: 'Tutup Paksa', danger: true,
      onConfirm: async () => {
        await api.updateSession(s.session.id, { status: 'force-closed', forceClosedBy: currentUser, debtors });
        const full = loadStore().session;
        await api.saveHistory(s.session.id, full);
        debtors.forEach(d => {
          api.notify(s.session.id, d, 'debt', 'Sesi ditutup paksa. Kamu tercatat belum membayar!');
        });
        setDialog(null);
      }
    });`
);

code = code.replace(
  /const markNotifsRead = \(\) => {[\s\S]*?refreshStore\(\);\n  };/,
  `const markNotifsRead = async () => {
    const s = loadStore();
    if (!s.session || !s.session.notifications) return;
    for (const n of s.session.notifications) {
      if ((n.to === currentUser || n.to === 'all') && !n.readBy?.includes(currentUser)) {
        await api.markNotifRead(n.id, currentUser);
      }
    }
  };`
);

code = code.replace(
  /const saveMenu = \(newMenu\) => {[\s\S]*?};\n/,
  `const saveMenu = async (newMenu) => {
    await api.saveMenu(newMenu);
  };\n`
);

fs.writeFileSync('src/App.jsx', code);
