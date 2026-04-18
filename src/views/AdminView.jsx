import { useState } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import { Shield, Trash2, ChevronDown, Coffee } from 'lucide-react';
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
  const { store, api } = useAppContext();
  const { menu, users, history, session: activeSession } = store;
  const { saveMenu: onSaveMenu, resetUserPin: onResetPin, saveAdminPin: onSaveAdminPin } = api;

  const [tab, setTab] = useState('menu');
  const [items, setItems] = useState(menu.map(m => ({ ...m })));
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newEmoji, setNewEmoji] = useState('');

  const addItem = () => {
    if (!newName || !newPrice) return;
    setItems([...items, { id: 'c' + Date.now(), name: newName, price: parseInt(newPrice) || 0, emoji: newEmoji }]);
    setNewName(''); setNewPrice(''); setNewEmoji('');
  };
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, val) => setItems(items.map(i => i.id === id ? { ...i, [field]: field === 'price' ? (parseInt(val) || 0) : val } : i));

  const [newAdminPin, setNewAdminPin] = useState('');
  const [confirmAdminPin, setConfirmAdminPin] = useState('');

  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [togglingStatus, setTogglingStatus] = useState(null);

  return (
    <div className="admin-view fade-in">
      <div className="admin-container">
        <div className="view-header">
          <h2 className="text-gradient"><Shield size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} /> Panel Admin</h2>
        </div>

        <div className="admin-tabs-modern">
          <button className={`admin-tab-item ${tab === 'menu' ? 'active' : ''}`} onClick={() => setTab('menu')}>☕ Menu</button>
          <button className={`admin-tab-item ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>👥 User</button>
          <button className={`admin-tab-item ${tab === 'session' ? 'active' : ''}`} onClick={() => setTab('session')}>⚡ Sesi Aktif</button>
          <button className={`admin-tab-item ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📜 Riwayat</button>
          <button className={`admin-tab-item ${tab === 'settings' ? 'active' : ''}`} onClick={() => setTab('settings')}>⚙️ Pengaturan</button>
        </div>

        <div className="admin-content-wrapper" style={{ flex: 1, overflowY: 'auto' }}>
          {tab === 'menu' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 800 }}>Daftar Menu Kopi</h4>
                <div className="menu-list">
                  {items.map(item => (
                    <div key={item.id} className="admin-list-item">
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                        <input className="emoji-input" style={{ width: '40px', background: 'transparent', border: 'none', textAlign: 'center' }} value={item.emoji} onChange={e => updateItem(item.id, 'emoji', e.target.value)} maxLength={2} />
                        <input style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, flex: 1 }} value={item.name} onChange={e => updateItem(item.id, 'name', e.target.value)} placeholder="Nama menu" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" style={{ width: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', textAlign: 'right', color: '#fff' }} value={item.price} onChange={e => updateItem(item.id, 'price', e.target.value)} placeholder="Harga" />
                        <button className="btn-icon-danger" style={{ padding: '8px' }} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />
                
                <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 700, opacity: 0.7 }}>+ Tambah Menu Baru</h4>
                <div className="admin-list-item" style={{ background: 'rgba(var(--accent-primary-rgb), 0.05)', borderColor: 'rgba(var(--accent-primary-rgb), 0.1)' }}>
                  <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                    <input className="emoji-input" style={{ width: '40px', background: 'transparent', border: 'none', textAlign: 'center' }} value={newEmoji} onChange={e => setNewEmoji(e.target.value)} maxLength={2} placeholder="☕" />
                    <input style={{ background: 'transparent', border: 'none', color: '#fff', fontWeight: 600, flex: 1 }} value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nama menu baru" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input type="number" style={{ width: '80px', background: 'rgba(var(--accent-primary-rgb), 0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '4px', textAlign: 'right', color: '#fff' }} value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="Harga" />
                    <button className="btn-primary btn-small" style={{ borderRadius: '10px' }} onClick={addItem}>Add</button>
                  </div>
                </div>

                <div style={{ marginTop: '2rem', display: 'flex', gap: '10px' }}>
                  <button className="btn-primary-pill" style={{ flex: 1 }} onClick={() => { onSaveMenu(items); alert("Menu berhasil diperbarui!"); }}>Simpan Perubahan Menu</button>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Manajemen User</h4>
                <div className="user-list">
                  {users.map(u => {
                    let debt = 0;
                    history.forEach(session => {
                      if (session.payerId !== u.id && (session.debtorIds || []).includes(u.id)) {
                        const order = session.orders?.find(o => o.userId === u.id);
                        debt += order?.item?.price || 0;
                      }
                    });
                    return (
                      <div key={u.id} className="admin-list-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <UserAvatar username={u.username} size={36} />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{u.username}</span>
                            <span className={debt > 0 ? 'text-red' : 'text-green'} style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {debt > 0 ? `Hutang: ${formatRp(debt)}` : 'Lunas'}
                            </span>
                          </div>
                        </div>
                        <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '10px' }} onClick={() => {
                          setDialog({
                            title: 'Reset PIN?',
                            message: `PIN untuk ${u.username} akan diubah menjadi '1234'.`,
                            onConfirm: () => { onResetPin(u.id); setDialog(null); }
                          });
                        }}>Reset PIN</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'session' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Sesi Aktif</h4>
                {activeSession ? (
                  <div style={{ padding: '1.25rem', background: 'rgba(230, 145, 56, 0.05)', borderRadius: '20px', border: '1px solid rgba(230, 145, 56, 0.2)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                      <span className="admin-stat-badge" style={{ background: 'rgba(230, 145, 56, 0.2)', color: 'var(--accent-primary)' }}>RUNNING</span>
                      <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{formatDate(activeSession.startedAt)}</span>
                    </div>
                    
                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Pembuat:</span>
                      <span style={{ fontWeight: 700 }}>{activeSession.startedBy}</span>
                    </div>
                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Payer:</span>
                      <span style={{ fontWeight: 700 }}>{activeSession.payer || '-'}</span>
                    </div>
                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Jumlah Pesanan:</span>
                      <span style={{ fontWeight: 700 }}>{activeSession.orders.length} Item</span>
                    </div>
                    <div className="stat-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.9rem' }}>
                      <span style={{ opacity: 0.7 }}>Status:</span>
                      <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>{activeSession.status.toUpperCase()}</span>
                    </div>

                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <button className="btn-danger-pill" onClick={() => {
                        setDialog({
                          title: 'Tutup Paksa?',
                          message: 'Hutang peserta akan dicatat. Sesi akan dipindahkan ke histori.',
                          onConfirm: () => { onForceClose(); setDialog(null); },
                          danger: true,
                          confirmText: 'Ya, Tutup'
                        });
                      }}>Tutup Paksa & Simpan Histori</button>

                      <button className="btn-logout" style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.8rem' }} onClick={() => {
                        setDialog({
                          title: 'Hapus Sesi?',
                          message: 'HAPUS PERMANEN? Data pesanan akan hilang total dan tidak masuk histori.',
                          onConfirm: () => { onDeleteActiveSession(activeSession.id); setDialog(null); },
                          danger: true,
                          confirmText: 'Hapus Total'
                        });
                      }}>Hapus Total (Tanpa Histori)</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}>
                    <Coffee size={48} style={{ marginBottom: '1rem' }} />
                    <p>Tidak ada sesi aktif saat ini.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'history' && (
            <div className="fade-in">
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Manajemen Histori</h4>
                {history.length === 0 ? (
                  <p style={{ textAlign: 'center', opacity: 0.5 }}>Belum ada histori.</p>
                ) : (
                  [...history].sort((a,b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0)).map(h => {
                    const total = h.orders?.reduce((sum, o) => sum + (o.item?.price || 0), 0) || 0;
                    const isExpanded = expandedHistoryId === h.id;

                    return (
                      <div key={h.id} style={{ marginBottom: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)} style={{ cursor: 'pointer', flex: 1 }}>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{formatDate(h.startedAt)}</p>
                            <p style={{ fontSize: '0.75rem', opacity: 0.6, margin: 0 }}>Payer: {h.payer} • {formatRp(total)}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-icon-danger" style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)' }} onClick={() => {
                              setDialog({
                                title: 'Hapus Histori?',
                                message: 'Hapus histori sesi ini secara PERMANEN?',
                                onConfirm: () => { onDeleteHistory(h.id); setDialog(null); },
                                danger: true,
                                confirmText: 'Ya, Hapus'
                              });
                            }}><Trash2 size={16} /></button>
                            <button 
                              className="btn-icon" 
                              style={{ padding: '8px', background: isExpanded ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                              onClick={() => setExpandedHistoryId(isExpanded ? null : h.id)}
                            >
                              <ChevronDown size={16} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }} />
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="fade-in" style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                                    <div key={idx} className="admin-list-item" style={{ background: 'rgba(0,0,0,0.2)', padding: '10px' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <UserAvatar username={ord.username} size={24} />
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{ord.username}</span>
                                          <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{ord.item.name}</span>
                                        </div>
                                      </div>
                                      {!isPayerOrder ? (
                                      <button 
                                        className="admin-stat-badge" 
                                        style={{ 
                                          border: 'none', 
                                          cursor: 'pointer',
                                          background: isPaid ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                          color: isPaid ? '#4ade80' : '#f87171' 
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
                                      <span className="admin-stat-badge" style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', opacity: 0.6 }}>PAYER</span>
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
              <div className="admin-card">
                <h4 style={{ marginBottom: '1.5rem', fontSize: '1rem', fontWeight: 800 }}>Pengaturan Sistem</h4>
                <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', marginBottom: '1.5rem' }}>
                  <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem' }}>Ganti PIN Admin</h5>
                  <div className="modern-form">
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                      <input type="password" style={{ background: 'rgba(0,0,0,0.2)' }} value={newAdminPin} onChange={e => setNewAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="PIN Baru" />
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <input type="password" style={{ background: 'rgba(0,0,0,0.2)' }} value={confirmAdminPin} onChange={e => setConfirmAdminPin(e.target.value.replace(/\D/g, ''))} maxLength={8} placeholder="Konfirmasi PIN" />
                    </div>
                    <button className="btn-primary-pill" style={{ fontSize: '0.85rem' }} onClick={() => {
                      if (newAdminPin.length < 4) { alert("PIN minimal 4 digit."); return; }
                      if (newAdminPin !== confirmAdminPin) { alert("PIN konfirmasi tidak cocok."); return; }
                      onSaveAdminPin(newAdminPin);
                      setNewAdminPin(''); setConfirmAdminPin('');
                      alert("PIN Admin berhasil diperbarui!");
                    }}>Update PIN Admin</button>
                  </div>
                </div>

                <div style={{ padding: '1.25rem', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '20px' }}>
                  <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#f87171' }}>Pembersihan Data</h5>
                  <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '1.25rem' }}>Hapus semua notifikasi lama untuk menjaga kecepatan aplikasi.</p>
                  <button className="btn-logout" style={{ background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', fontSize: '0.8rem' }} onClick={() => {
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
                  }}>Bersihkan Semua Notifikasi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminView;
