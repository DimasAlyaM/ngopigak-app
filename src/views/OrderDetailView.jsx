import { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext.jsx';
import { AlertTriangle, ChevronLeft, Camera, CheckCircle, Loader2 } from 'lucide-react';
import { loadStore } from '../store.js';
import { formatRp, formatDate } from '../utils/formatters.js';
import StatusBadge from '../components/StatusBadge';

/**
 * OrderDetailView Component
 */
function OrderDetailView({ 
  order, 
  onBack, 
  onPaymentConfirm, 
  setDialog, 
  setPreviewProof 
}) {
  const { store, currentUser, api } = useAppContext();
  if (!order) return (
    <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <AlertTriangle size={48} className="text-secondary opacity-50 mb-4" />
      <p className="text-secondary">Data pesanan tidak ditemukan.</p>
      <button className="btn-primary mt-4" onClick={onBack}>Kembali</button>
    </div>
  );

  const [isUploading, setIsUploading] = useState(false);
  const [localProof, setLocalProof] = useState(order?.paymentProof || '');
  const [localIsPaid, setLocalIsPaid] = useState(order?.isPaid || false);
  const [sessionInfo, setSessionInfo] = useState(null);

  useEffect(() => {
    if (!order) return;
    const s = loadStore();
    let sess = null;
    if (order.sessionId === 'active') {
      sess = s.session;
    } else {
      sess = s.history.find(h => h.id === order.sessionId);
    }
    setSessionInfo(sess);
  }, [order]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await api.uploadProof(file);
      if (order.sessionId === 'active') {
        const s = loadStore();
        const activeOrder = s.session.orders.find(o => o.username === currentUser);
        if (activeOrder) {
          await api.updateOrder(activeOrder.id, { paymentProof: url });
        }
      } else {
        await api.updateHistoricalOrder(order.sessionId, currentUser, { paymentProof: url });
      }
      setLocalProof(url);
    } catch (err) {
      alert("Gagal upload: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmPay = async () => {
    const prevPaid = localIsPaid;
    setLocalIsPaid(true); // Optimistic
    try {
      if (order.sessionId === 'active') {
        const s = loadStore();
        const activeOrder = s.session?.orders?.find(o => (o.username || '').toLowerCase() === (currentUser || '').toLowerCase());
        if (activeOrder) {
          await api.updateOrder(activeOrder.id, { isPaid: true, markedByPayer: false });
          api.notify(s.session.id, s.session.payer, 'payment', `${currentUser} telah membayar & upload bukti.`);
          if (onPaymentConfirm) onPaymentConfirm(s, activeOrder.id);
        }
      } else {
        await api.updateHistoricalOrder(order.sessionId, currentUser, { isPaid: true });
      }
      alert("Konfirmasi pembayaran terkirim!");
    } catch (err) {
      setLocalIsPaid(prevPaid); // Rollback
      alert("Gagal konfirmasi: " + err.message);
    }
  };

  return (
    <div className="order-detail-view fade-in" style={{ padding: '1rem' }}>
      <div className="view-header" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="glass-panel" style={{ padding: '8px', borderRadius: '12px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onBack}>
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-gradient">Detail Pesanan</h2>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', borderRadius: '32px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: '1rem', background: 'var(--surface)', width: '100px', height: '100px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
          {order.item?.emoji || '☕'}
        </div>
        <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{order.item?.name || 'Item'}</h3>
        <p className="text-accent" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '2rem' }}>{formatRp(order.item?.price)}</p>

        <div style={{ background: 'var(--bg-primary)', borderRadius: '24px', padding: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
            <span className="text-secondary">Waktu Sesi</span>
            <strong>{formatDate(order.sessionDate).split(',')[0]}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
            <span className="text-secondary">Payer</span>
            <strong>{order.payer}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', fontSize: '0.9rem' }}>
            <span className="text-secondary">Status</span>
            <StatusBadge isPaid={localIsPaid} />
          </div>
        </div>
      </div>

      {!localIsPaid && (
        <div className="payment-management fade-in">
          {sessionInfo?.paymentInfo ? (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid var(--accent-primary)', background: 'rgba(230, 145, 56, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Info Transfer</h4>
                <span className="badge badge-amber">{sessionInfo.paymentInfo.method}</span>
              </div>
              <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{sessionInfo.paymentInfo.accountNo}</p>
                  <p className="text-secondary" style={{ fontSize: '0.8rem', margin: 0 }}>{sessionInfo.paymentInfo.bankName || 'Digital Wallet'}</p>
                </div>
                <button className="btn-secondary" style={{ width: 'auto', padding: '6px 12px', fontSize: '0.7rem' }} onClick={() => { navigator.clipboard.writeText(sessionInfo.paymentInfo.accountNo); alert('Disalin!'); }}>Salin</button>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              <p className="text-secondary" style={{ fontSize: '0.85rem' }}>Menunggu info pembayaran dari <strong>{order.payer}</strong>...</p>
            </div>
          )}

          <h4 style={{ marginBottom: '1rem', paddingLeft: '4px' }}>Upload Bukti Bayar</h4>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '32px' }}>
            <label className="upload-box-new" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '2px dashed var(--glass-border)', borderRadius: '24px', padding: '2rem', cursor: 'pointer', transition: 'all 0.3s ease' }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
              <div style={{ textAlign: 'center' }}>
                {isUploading ? <Loader2 size={32} className="animate-spin text-accent" /> : localProof ? <CheckCircle size={32} className="text-green" /> : <Camera size={32} className="text-secondary" />}
                <p style={{ marginTop: '8px', fontSize: '0.8rem', fontWeight: 600 }}>{localProof ? 'Ganti Foto' : 'Pilih Foto'}</p>
              </div>
            </label>

            <div style={{ marginTop: '1.5rem' }}>
              {localProof && (
                <div 
                  style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--glass-border)', marginBottom: '1.5rem', cursor: 'pointer' }}
                  onClick={() => setPreviewProof({ url: localProof, username: currentUser })}
                >
                  <img src={localProof} alt="Bukti" style={{ width: '100%', maxHeight: '250px', objectFit: 'cover' }} />
                </div>
              )}
              <button 
                className="btn-primary" 
                style={{ width: '100%', height: '56px', borderRadius: '20px' }} 
                onClick={() => {
                  if (!localProof) {
                    setDialog({
                      title: 'Status Cash?',
                      message: 'Belum ada bukti foto, kirim status sebagai Cash?',
                      onConfirm: () => { handleConfirmPay(); setDialog(null); },
                      confirmText: 'Ya, Cash'
                    });
                  } else {
                    handleConfirmPay();
                  }
                }} 
                disabled={isUploading}
              >
                {isUploading ? 'Mengirim...' : 'Konfirmasi Bayar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {localIsPaid && (
        <div className="glass-panel fade-in" style={{ padding: '2.5rem 1.5rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', textAlign: 'center', borderRadius: '32px' }}>
          <div style={{ background: '#4ade80', width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'white' }}>
            <CheckCircle size={32} />
          </div>
          <h3 style={{ marginBottom: '0.5rem' }}>Pesanan Sudah Lunas</h3>
          <p className="text-secondary" style={{ fontSize: '0.9rem' }}>Terima kasih sudah bayar tepat waktu! Kamu keren.</p>
          {localProof && (
            <div style={{ marginTop: '2rem', opacity: 0.6 }}>
              <p className="text-secondary" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>Bukti terupload:</p>
              <img src={localProof} alt="Proof" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderDetailView;
