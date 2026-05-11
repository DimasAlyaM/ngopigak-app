import { useState, useEffect } from 'react';
import { useAppStore } from "../context/useAppStore.js";
import { api } from "../store.js";
import { AlertTriangle, ChevronLeft, Camera, CheckCircle, Loader2, Copy } from 'lucide-react';
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
  const { currentUser, store, setSelectedOrder } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [localProofUrl, setLocalProofUrl] = useState(null);
  
  // Keep liveOrder in sync with store
  const [liveOrder, setLiveOrder] = useState(order);

  useEffect(() => {
    if (!order) return;
    
    // Find latest session
    let session = null;
    if (store.session && (order.sessionId === 'active' || order.sessionId === store.session.id)) {
      session = store.session;
    } else {
      session = store.history.find(h => h.id === order.sessionId);
    }

    if (session) {
      const found = session.orders.find(o => 
        o.id === order.id || 
        (o.userId && o.userId === order.userId) ||
        (o.username === order.username && o.item?.name === order.item?.name)
      );
      if (found) {
        setLiveOrder({ ...order, ...found, sessionId: session.id });
      }
    }
  }, [store.session, store.history, order]);

  const isPaid = (() => {
    if (!liveOrder) return false;
    
    // For live sessions
    if (store.session && (liveOrder.sessionId === 'active' || liveOrder.sessionId === store.session.id)) {
      return liveOrder.isPaid;
    }
    
    // For historical
    const session = store.history.find(h => h.id === liveOrder.sessionId);
    if (session) {
      const inDebtors = (session.debtors || []).some(d => (d || '').toLowerCase() === (currentUser?.username || '').toLowerCase());
      const inDebtorIds = (session.debtorIds || []).includes(currentUser?.id);
      return !inDebtors && !inDebtorIds;
    }
    return liveOrder.isPaid;
  })();

  const proofUrl = localProofUrl || liveOrder?.paymentProof || '';
  
  // Resolve payment info from session or order
  const sessionForInfo = (store.session && (liveOrder?.sessionId === 'active' || liveOrder?.sessionId === store.session.id)) 
    ? store.session 
    : store.history.find(h => h.id === liveOrder?.sessionId);

  const rawPInfo = sessionForInfo?.paymentInfo || liveOrder?.paymentInfo;
  const pInfo = (rawPInfo && (rawPInfo.method || rawPInfo.payment_method || rawPInfo.paymentMethod)) ? {
    method: rawPInfo.method || rawPInfo.payment_method || rawPInfo.paymentMethod,
    bankName: rawPInfo.bankName || rawPInfo.bank_name,
    accountNo: rawPInfo.accountNo || rawPInfo.account_no || rawPInfo.accountNumber || rawPInfo.account_number
  } : null;

  if (!order) return (
    <div className="session-container fade-in" style={{ textAlign: 'center', paddingTop: '4rem' }}>
      <div className="glass-panel" style={{ padding: '3rem 1.5rem' }}>
        <AlertTriangle size={64} className="text-secondary mb-6" style={{ margin: '0 auto', opacity: 0.5 }} />
        <p className="text-secondary font-bold">Data pesanan tidak ditemukan.</p>
        <button className="btn-primary mt-8" onClick={onBack}>Kembali</button>
      </div>
    </div>
  );

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      console.log("Starting upload process for order session:", liveOrder.sessionId);
      const url = await api.uploadProof(file);
      setLocalProofUrl(url);
      
      const s = loadStore();
      const isLive = liveOrder.sessionId === 'active' || (s.session && liveOrder.sessionId === s.session.id);
      
      if (isLive) {
        const activeOrder = s.session.orders.find(o => String(o.userId) === String(currentUser.id));
        if (activeOrder) {
          await api.updateOrder(activeOrder.id, { paymentProof: url });
        } else {
          console.error("Could not find active order in session to attach proof");
        }
      } else {
        await api.updateHistoricalOrder(liveOrder.sessionId, currentUser.id, { paymentProof: url });
      }
    } catch (err) {
      console.error("Upload handler error:", err);
      const msg = err.code === 'PGRST204' 
        ? "Gagal simpan: Kolom database belum lengkap. Hubungi Admin untuk jalankan SQL Migration."
        : "Gagal upload: " + err.message;
      alert(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmPay = async () => {
    try {
      const s = loadStore();
      const isLive = liveOrder.sessionId === 'active' || (s.session && liveOrder.sessionId === s.session.id);
      
      if (isLive) {
        const activeOrder = s.session?.orders?.find(o => String(o.userId) === String(currentUser.id));
        if (activeOrder) {
          await api.updateOrder(activeOrder.id, { isPaid: true, markedByPayer: false });
          api.notify(s.session.id, { id: s.session.payerId, username: s.session.payer }, 'payment', `${currentUser.username} telah membayar & upload bukti.`);
          if (onPaymentConfirm) onPaymentConfirm();
        }
      } else {
        await api.updateHistoricalOrder(liveOrder.sessionId, currentUser.id, { isPaid: true });
      }
    } catch (err) {
      console.error("Confirm pay error:", err);
      const msg = err.code === 'PGRST204' 
        ? "Gagal konfirmasi: Database tidak mendukung fitur ini. Hubungi Admin (Missing 'paid_at')."
        : "Gagal konfirmasi: " + err.message;
      alert(msg);
    }
  };

  return (
    <div className="order-detail-view fade-in session-container">
      <div className="view-header mb-8" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          className="btn-secondary" 
          style={{ width: '44px', height: '44px', borderRadius: '14px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
          onClick={onBack}
        >
          <ChevronLeft size={24} />
        </button>
        <h2 style={{ fontSize: '1.5rem' }}>Detail Pesanan</h2>
      </div>

      <div className="glass-panel mb-6" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <div className="mb-6" style={{ fontSize: '4rem', background: 'var(--bg-primary)', width: '112px', height: '112px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', border: '1px solid var(--glass-border)' }}>
          {liveOrder.item?.emoji || '☕'}
        </div>
        <h3 className="mb-2" style={{ fontSize: '1.5rem' }}>{liveOrder.item?.name || 'Item'}</h3>
        <p className="text-accent mb-10" style={{ fontSize: '2rem', fontWeight: 800 }}>{formatRp(liveOrder.item?.price)}</p>

        <div style={{ background: 'var(--bg-primary)', borderRadius: '24px', padding: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
            <span className="text-secondary font-bold">Waktu Sesi</span>
            <strong className="text-primary">{formatDate(liveOrder.sessionDate || sessionForInfo?.startedAt)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', borderBottom: '1px solid var(--glass-border)', fontSize: '0.9rem' }}>
            <span className="text-secondary font-bold">Payer</span>
            <strong className="text-primary">{liveOrder.payer || sessionForInfo?.payer}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 12px', fontSize: '0.9rem', alignItems: 'center' }}>
            <span className="text-secondary font-bold">Status</span>
            {liveOrder.userId !== liveOrder.payerId ? (
              <StatusBadge isPaid={isPaid} />
            ) : (
              <span className="badge-role guest" style={{ opacity: 0.6 }}>PAYER SESI INI</span>
            )}
          </div>
        </div>
      </div>

      {/* Payment section */}
      {!isPaid && (currentUser?.id === liveOrder.userId) && (liveOrder.userId !== liveOrder.payerId) && (
        <div className="payment-management fade-in">
          {pInfo ? (
            <div className="payment-card-highlight mb-6">
              <div className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 className="m-0" style={{ fontWeight: 800 }}>Info Transfer</h4>
                <span className="badge-role payer">{pInfo.method}</span>
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 900, fontSize: '1.25rem', margin: 0, color: 'white' }}>{pInfo.accountNo}</p>
                  <p className="text-secondary" style={{ fontSize: '0.85rem', margin: '4px 0 0', fontWeight: 600 }}>{pInfo.bankName || 'Digital Wallet'}</p>
                </div>
                <button 
                  className="btn-secondary" 
                  style={{ width: '44px', height: '44px', borderRadius: '12px', padding: 0, background: 'rgba(255,255,255,0.1)', border: 'none' }} 
                  onClick={() => { 
                    navigator.clipboard.writeText(pInfo.accountNo); 
                    alert('Disalin!'); 
                  }}
                >
                  <Copy size={20} color="white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel mb-6" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <p className="text-secondary font-bold" style={{ fontSize: '0.9rem' }}>
                {sessionForInfo?.status === 'payment-setup' 
                  ? `Menunggu info pembayaran dari ${liveOrder.payer || sessionForInfo?.payer}...` 
                  : `Info pembayaran belum tersedia (Sesi: ${sessionForInfo?.status || 'Unknown'})`
                }
              </p>
            </div>
          )}

          <div className="section-header mb-4">
            <h4 style={{ fontWeight: 800 }}>Upload Bukti Bayar</h4>
          </div>
          
          <div className="glass-panel mb-10">
            <label className="upload-box" style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              background: 'var(--bg-primary)', 
              border: '2px dashed var(--glass-border)', 
              borderRadius: '24px', 
              padding: '2.5rem 1.5rem', 
              cursor: 'pointer', 
              transition: 'all 0.3s ease' 
            }}>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUpload} disabled={isUploading} />
              <div className="mb-3" style={{ background: 'var(--surface)', width: '64px', height: '64px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {isUploading ? <Loader2 size={32} className="spin text-accent" /> : proofUrl ? <CheckCircle size={32} style={{ color: 'var(--success)' }} /> : <Camera size={32} className="text-secondary" />}
              </div>
              <p style={{ fontSize: '0.9rem', fontWeight: 800 }}>{proofUrl ? 'Ganti Foto Bukti' : 'Pilih Foto Bukti'}</p>
              {!proofUrl && <p className="text-secondary mt-1" style={{ fontSize: '0.75rem', fontWeight: 600 }}>Tap untuk membuka galeri/kamera</p>}
            </label>

            {proofUrl && (
              <div 
                className="mt-6 mb-6"
                style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                onClick={() => setPreviewProof({ url: proofUrl, username: currentUser.username, userId: currentUser.id })}
              >
                <img src={proofUrl} alt="Bukti" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
              </div>
            )}

            <button
              className="btn-primary mt-6"
              style={{ width: '100%' }}
              onClick={() => {
                if (!proofUrl) {
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
      )}

      {/* Payer viewing a debtor's unpaid order */}
      {!isPaid && (currentUser?.id === liveOrder.payerId) && (liveOrder.userId !== liveOrder.payerId) && (
        <div className="payment-card-highlight text-center" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div className="mb-6" style={{ background: 'rgba(255,255,255,0.05)', width: '72px', height: '72px', borderRadius: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
            <AlertTriangle size={36} className="text-accent" />
          </div>
          <h3 className="mb-2">Menunggu Pembayaran</h3>
          <p className="text-secondary" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}><strong>{liveOrder.username}</strong> belum membayar hutangnya kepada kamu.</p>
        </div>
      )}

      {isPaid && (
        <div className="glass-panel fade-in" style={{ padding: '3rem 1.5rem', background: 'rgba(74, 222, 128, 0.05)', border: '1px solid rgba(74, 222, 128, 0.2)', textAlign: 'center', borderRadius: '32px' }}>
          <div className="mb-6" style={{ background: 'var(--success)', width: '72px', height: '72px', borderRadius: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', color: 'white' }}>
            <CheckCircle size={36} />
          </div>
          <h3 className="mb-2">Pesanan Sudah Lunas</h3>
          <p className="text-secondary mb-8" style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>Terima kasih sudah bayar tepat waktu! Kamu keren. ✨</p>
          {proofUrl && (
            <div style={{ marginTop: '2rem' }}>
              <p className="text-secondary font-bold mb-3" style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>Bukti terupload:</p>
              <div 
                style={{ width: '120px', height: '120px', margin: '0 auto', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                onClick={() => setPreviewProof({ url: proofUrl, username: liveOrder.username, userId: liveOrder.userId })}
              >
                <img src={proofUrl} alt="Proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default OrderDetailView;
