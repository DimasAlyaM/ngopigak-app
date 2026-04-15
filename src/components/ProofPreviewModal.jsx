import React from 'react';
import { X } from 'lucide-react';
import UserAvatar from './UserAvatar';

/**
 * ProofPreviewModal Component
 * Full-screen modal for image previews with blurring background.
 */
function ProofPreviewModal({ url, onClose, username }) {
  if (!url) return null;
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.9)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(10px)'
    }}>
      <div className="modal-content fade-in-scale" onClick={e => e.stopPropagation()} style={{
        maxWidth: '100%',
        maxHeight: '100%',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserAvatar username={username} size={32} />
            <span style={{ fontWeight: 700, color: 'white' }}>Bukti {username}</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={24} />
          </button>
        </div>
        <img 
          src={url} 
          alt="Bukti Bayar" 
          style={{ 
            maxWidth: '100%', 
            maxHeight: '80vh', 
            objectFit: 'contain', 
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }} 
        />
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button className="btn-primary-pill" onClick={onClose}>Tutup</button>
        </div>
      </div>
    </div>
  );
}

export default ProofPreviewModal;
