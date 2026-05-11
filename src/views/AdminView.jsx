import { useState } from 'react';
import { useAppStore } from "../context/useAppStore.js";
import { api } from "../store.js";
import { Shield, Trash2, ChevronDown, Coffee, Users, Zap, History, Settings, Plus, RefreshCcw, BellOff } from 'lucide-react';
import UserAvatar from '../components/UserAvatar';
import { formatRp, formatDate } from '../utils/formatters.js';

/**
 * AdminView Component
 */
function AdminView({ 
  onForceClose, 
  onDeleteActiveSession, 
  onDeleteHistory, 
  onUpdateHistoricalOrder, 
  onDeleteAllNotifs, 
  setDialog 
}) {
  const { store } = useAppStore();
  const { menu, users, history, session: activeSession } = store;
  const { saveMenu: onSaveMenu, resetUserPin: onResetPin, saveAdminPin: onSaveAdminPin } = api;

  const [tab, setTab] = useState('menu');
  const [items, setItems] = useState(menu.map(m => ({ ...m })));
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newEmoji, setNewEmoji] = useState('');

  const addItem = () => {
    if (!newName || !newPrice) return;
    setItems([...items, { id: 'c' + Date.now(), name: newName, price: parseInt(newPrice) || 0, emoji: newEmoji || '☕' }]);
    setNewName(''); setNewPrice(''); setNewEmoji('');
  };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, val) => setItems(items.map(i => i.id === id ? { ...i, [field]: field === 'price' ? (parseInt(val) || 0) : val } : i));

  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(null);

  const tabs = [
    { id: 'menu', label: 'Menu', icon: Coffee },
    { id: 'users', label: 'User', icon: Users },
    { id: 'session', label: 'Aktif', icon: Zap },
    { id: 'history', label: 'Histori', icon: History },
    { id: 'settings', label: 'Sistem', icon: Settings },
  ];

  return (
    <div className="admin-view fade-in session-container">
      <div className="section-header mb-6" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ background: 'var(--accent-primary)', width: '48px', height: '48px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: 'var(--shadow-accent)' }}>
          <Shield size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '2px' }}>Panel Admin</h2>
          <p className="text-secondary" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Kelola menu, user, dan sesi NgopiGak.</p>
        </div>
      </div>

      {/* Modern Segmented Control for Tabs */}
      <div className="glass-panel p-1 mb-8" style={{ display: 'flex', gap: '4px', borderRadius: '16px', padding: '6px', background: 'rgba(255,255,255,0.03)' }}>
        {tabs.map(t => (
          <button 
            key={t.id}
            className={`admin-tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 4px',
              borderRadius: '12px',
              background: tab === t.id ? 'var(--accent-primary)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-secondary)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <t.icon size={20} />
            <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase' }}>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="admin-content" style={{ minHeight: '400px' }}>
        {tab === 'menu' && (
          <div className="fade-in">
            <div className="glass-panel mb-6">
              <div className="section-header mb-6">
                <h4 style={{ fontWeight: 800 }}>Daftar Menu Kopi</h4>
              </div>
              
              <div className="card-stack">
                {items.map(item => (
                  <div key={item.id} className="history-card mb-3" style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <input 
                        className="emoji-input" 
                        style={{ width: '44px', height: '44px', background: 'var(--bg-primary)', border: '1px solid var(--glass-border)', borderRadius: '12px', textAlign: 'center', fontSize: '1.25rem' }} 
                        value={item.emoji} 
                        onChange={e => updateItem(item.id, 'emoji', e.target.value)} 
                        maxLength={2} 
                      />
                      <div style={{ flex: 1 }}>
                        <input 
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 800, fontSize: '1rem', width: '100%' }} 
                          value={item.name} 
                          onChange={e => updateItem(item.id, 'name', e.target.value)} 
                          placeholder="Nama menu" 
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--accent-primary)' }}>Rp</span>
                          <input 
                            type="number" 
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '0.85rem', width: '80px' }} 
                            value={item.price} 
                            onChange={e => updateItem(item.id, 'price', e.target.value)} 
                          />
                        </div>
                      </div>
                      <button 
                        className="btn-secondary" 
                        style={{ width: '40px', height: '40px', padding: 0, borderRadius: '10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--glass-border)', margin: '2rem 0' }} />
              
              <div className="section-header mb-4">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>TAMBAH MENU BARU</h4>
              </div>
              
              <div className="glass-panel" style={{ background: 'rgba(230, 145, 56, 0.05)', border: '1px dashed var(--accent-primary)', padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem' }}>
                  <input className="premium-input" style={{ width: '60px', textAlign: 'center', fontSize: '1.5rem' }} value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2} placeholder="☕" />
                  <input className="premium-input" style={{ flex: 1 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama menu baru..." />
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--accent-primary)' }}>Rp</span>
                    <input type="number" className="premium-input" style={{ paddingLeft: '44px' }} value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Harga" />
                  </div>
                  <button className="btn-primary" style={{ width: 'auto', padding: '0 1.5rem' }} onClick={addItem}>
                    <Plus size={20} />
                  </button>
                </div>
              </div>

              <button className="btn-primary mt-8" onClick={() => { onSaveMenu(items); alert("Menu berhasil diperbarui!"); }}>
                Simpan Perubahan Menu
              </button>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="fade-in">
            <div className="glass-panel mb-6">
              <div className="section-header mb-6">
                <h4 style={{ fontWeight: 800 }}>Manajemen User</h4>
              </div>
              <div className="card-stack">
                {users.map(u => {
                  let debt = 0;
                  history.forEach(session => {
                    if (session.payerId !== u.id && (session.debtorIds || []).includes(u.id)) {
                      const order = session.orders?.find(o => o.userId === u.id);
                      debt += order?.item?.price || 0;
                    }
                  });
                  return (
                    <div key={u.id} className="history-card mb-3" style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ position: 'relative' }}>
                          <UserAvatar username={u.username} size={48} />
                          {debt > 0 && <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '12px', height: '12px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--bg-primary)' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 800, fontSize: '1rem' }}>{u.username}</p>
                          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: debt > 0 ? 'var(--danger)' : 'var(--success)', marginTop: '2px' }}>
                            {debt > 0 ? `Hutang: ${formatRp(debt)}` : 'Lunas'}
                          </p>
                        </div>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0 12px', height: '36px', fontSize: '0.75rem', fontWeight: 800, borderRadius: '10px' }} 
                          onClick={() => {
                            setDialog({
                              title: 'Reset PIN?',
                              message: `PIN untuk ${u.username} akan diubah menjadi '1234'.`,
                              onConfirm: () => { onResetPin(u.id); setDialog(null); }
                            });
                          }}
                        >
                          RESET PIN
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'session' && (
          <div className="fade-in">
            <div className="glass-panel mb-6">
              <div className="section-header mb-6">
                <h4 style={{ fontWeight: 800 }}>Sesi Aktif</h4>
              </div>
              {activeSession ? (
                <div className="payment-card-highlight" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="pulsing-dot" />
                      <span style={{ fontWeight: 900, fontSize: '0.85rem', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>LIVE SESSION</span>
                    </div>
                    <span className="text-secondary" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{formatDate(activeSession.startedAt)}</span>
                  </div>
                  
                  <div className="card-stack mb-8">
                    <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Pembuat Sesi</span>
                      <strong style={{ color: 'white' }}>{activeSession.startedBy}</strong>
                    </div>
                    <div className="glass-panel mt-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Payer</span>
                      <strong style={{ color: 'white' }}>{activeSession.payer || '-'}</strong>
                    </div>
                    <div className="glass-panel mt-2" style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', border: 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="text-secondary" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Jumlah Pesanan</span>
                      <strong style={{ color: 'white' }}>{activeSession.orders.length} Item</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button className="btn-primary" style={{ background: 'var(--success)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }} onClick={() => {
                        setDialog({
                          title: 'Tutup Paksa?',
                          message: !activeSession.paymentInfo 
                            ? 'PERINGATAN: Payer BELUM mengisi info pembayaran. Jika ditutup sekarang, info pembayaran di histori akan KOSONG. Lanjutkan?' 
                            : 'Sesi akan ditutup dan hutang peserta akan dicatat di histori.',
                          onConfirm: () => { onForceClose(); setDialog(null); },
                          danger: true,
                          confirmText: !activeSession.paymentInfo ? 'Ya, Tutup Tanpa Info' : 'Ya, Tutup Sesi'
                        });
                    }}>
                      Tutup Paksa & Simpan Histori
                    </button>

                    <button 
                      className="btn-secondary" 
                      style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', fontWeight: 800 }} 
                      onClick={() => {
                        setDialog({
                          title: 'Hapus Sesi?',
                          message: 'HAPUS PERMANEN? Data pesanan akan hilang total dan tidak masuk histori.',
                          onConfirm: () => { onDeleteActiveSession(activeSession.id); setDialog(null); },
                          danger: true,
                          confirmText: 'Hapus Total'
                        });
                      }}
                    >
                      Hapus Total (Tanpa Histori)
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.5 }}>
                  <div style={{ background: 'var(--surface)', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Zap size={40} className="text-secondary" />
                  </div>
                  <p className="font-bold">Tidak ada sesi aktif saat ini.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="fade-in">
            <div className="glass-panel mb-6">
              <div className="section-header mb-6">
                <h4 style={{ fontWeight: 800 }}>Manajemen Histori</h4>
              </div>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', opacity: 0.5 }}>
                  <History size={40} className="text-secondary mb-4" />
                  <p className="font-bold">Belum ada histori.</p>
                </div>
              ) : (
                [...history].sort((a,b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0)).map(h => {
                  const total = h.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
                  const isExpanded = expandedHistoryId === h.id;

                  return (
                    <div key={h.id} className="mb-4" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                      <div 
                        style={{ padding: '16px', background: isExpanded ? 'rgba(255,255,255,0.03)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                      >
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 800, fontSize: '0.95rem', margin: 0 }}>{formatDate(h.startedAt)}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                            <span className="badge-role payer" style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{h.payer}</span>
                            <span className="text-accent" style={{ fontSize: '0.85rem', fontWeight: 800 }}>{formatRp(total)}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ width: '36px', height: '36px', padding: 0, borderRadius: '10px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }} 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDialog({
                                title: 'Hapus Histori?',
                                message: 'Hapus histori sesi ini secara PERMANEN?',
                                onConfirm: () => { onDeleteHistory(h.id); setDialog(null); },
                                danger: true,
                                confirmText: 'Ya, Hapus'
                              });
                            }}
                          >
                            <Trash2 size={16} />
                          </button>
                          <div style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                            <ChevronDown size={20} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="fade-in p-4" style={{ background: 'rgba(0,0,0,0.15)', borderTop: '1px solid var(--glass-border)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                             {h.orders.map((ord, idx) => {
                                const isPayerOrder = h.payerId
                                  ? ord.userId === h.payerId
                                  : ord.username?.toLowerCase() === h.payer?.toLowerCase();
                                const isPaid = isPayerOrder ? true : (
                                  h.debtorIds
                                    ? !h.debtorIds.includes(ord.userId)
                                    : !h.debtors?.some(d => (d || '').toLowerCase() === (ord.username || '').toLowerCase())
                                );
                                return (
                                  <div key={idx} className="glass-panel" style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <UserAvatar username={ord.username} size={28} />
                                      <div>
                                        <p style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0 }}>{ord.username}</p>
                                        <p className="text-secondary" style={{ fontSize: '0.7rem', fontWeight: 600, margin: 0 }}>{ord.item.name}</p>
                                      </div>
                                    </div>
                                    {!isPayerOrder ? (
                                      <button 
                                        className={`badge-role ${isPaid ? 'payer' : 'guest'}`} 
                                        style={{ 
                                          border: 'none', 
                                          cursor: 'pointer',
                                          fontSize: '0.65rem',
                                          fontWeight: 900,
                                          padding: '4px 10px',
                                          borderRadius: '8px',
                                          background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                          color: isPaid ? 'var(--success)' : 'var(--danger)',
                                          letterSpacing: '0.05em'
                                        }}
                                        onClick={async () => {
                                          const key = `${h.id}-${ord.userId}`;
                                          setTogglingStatus(key);
                                          try {
                                            await onUpdateHistoricalOrder(h.id, ord.userId, { isPaid: !isPaid });
                                          } finally {
                                            setTogglingStatus(null);
                                          }
                                        }}
                                      >
                                        {togglingStatus === `${h.id}-${ord.userId}` ? '...' : (isPaid ? 'LUNAS' : 'HUTANG')}
                                      </button>
                                    ) : (
                                      <span className="badge-role payer" style={{ fontSize: '0.65rem', opacity: 0.6 }}>PAYER</span>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="fade-in">
            <div className="glass-panel mb-6">
              <div className="section-header mb-6">
                <h4 style={{ fontWeight: 800 }}>Pengaturan Sistem</h4>
              </div>
              
              <div className="glass-panel mb-6" style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem' }}>
                <div className="mb-6" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield size={18} className="text-accent" />
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Keamanan Admin</h5>
                </div>
                
                <div className="modern-form">
                  <div className="form-group mb-3">
                    <input type="password" className="premium-input" value={newAdminPin} onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="PIN Admin Baru" />
                  </div>
                  <div className="form-group mb-6">
                    <input type="password" className="premium-input" value={confirmAdminPin} onChange={e => setConfirmAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="Konfirmasi PIN Baru" />
                  </div>
                  <button className="btn-primary" onClick={() => {
                    if (newAdminPin.length < 4) { alert("PIN minimal 4 digit."); return; }
                    if (newAdminPin !== confirmAdminPin) { alert("PIN konfirmasi tidak cocok."); return; }
                    onSaveAdminPin(newAdminPin);
                    setNewAdminPin(''); setConfirmAdminPin('');
                    alert("PIN Admin berhasil diperbarui!");
                  }}>
                    Update PIN Admin
                  </button>
                </div>
              </div>

              <div className="glass-panel" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', padding: '1.5rem' }}>
                <div className="mb-3" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BellOff size={18} className="text-danger" />
                  <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--danger)' }}>Pemeliharaan</h5>
                </div>
                <p className="text-secondary mb-6" style={{ fontSize: '0.8rem', fontWeight: 600 }}>Bersihkan notifikasi lama untuk menjaga performa database.</p>
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)', fontWeight: 800 }} 
                  onClick={() => {
                    setDialog({
                      title: 'Bersihkan Notif?',
                      message: 'Hapus semua notifikasi secara permanen?',
                      onConfirm: () => {
                        onDeleteAllNotifs();
                        setDialog(null);
                        alert("Semua notifikasi telah dibersihkan.");
                      },
                      danger: true,
                      confirmText: 'Ya, Bersihkan'
                    });
                  }}
                >
                  Bersihkan Semua Notifikasi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminView;
