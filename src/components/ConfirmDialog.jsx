import React from 'react';

/**
 * ConfirmDialog Component
 * A slide-up bottom sheet for confirmation actions.
 */
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmText = 'Ya, Lanjutkan', danger = false }) {
  return (
    <div className="bottom-sheet-overlay" onClick={onCancel}>
      <div className="bottom-sheet-container fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="bottom-sheet-handle"></div>
        <div className="bottom-sheet-content">
          <h3 className="bottom-sheet-title">{title}</h3>
          <p className="bottom-sheet-message text-secondary">{message}</p>
          <div className="bottom-sheet-actions">
            <button className="btn-secondary-pill" onClick={onCancel}>Batal</button>
            <button className={danger ? 'btn-danger-pill' : 'btn-primary-pill'} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
