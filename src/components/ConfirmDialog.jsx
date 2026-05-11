import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';

/**
 * ConfirmDialog Component
 * A premium slide-up bottom sheet for confirmation actions.
 */
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Ya, Lanjutkan', danger = false }) {
  return (
    <div className="confirm-dialog-overlay" onClick={onCancel}>
      <motion.div 
        className="confirm-dialog-container"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.8 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="confirm-dialog-handle" />
        
        <div className="confirm-dialog-content">
          <div className={`confirm-dialog-icon ${danger ? 'danger' : ''}`}>
            {danger ? <AlertTriangle size={32} /> : <Info size={32} />}
          </div>
          
          <h3 className="confirm-dialog-title">{title}</h3>
          <p className="confirm-dialog-message">{message}</p>
          
          <div className="confirm-dialog-actions">
            <button 
              className={danger ? 'btn-dialog-danger' : 'btn-dialog-primary'} 
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button 
              className="btn-dialog-secondary" 
              onClick={onCancel}
            >
              Batal
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default ConfirmDialog;
