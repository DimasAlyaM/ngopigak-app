import { useState, useEffect } from 'react';
import { RefreshCw, Sparkles, X } from 'lucide-react';

/**
 * UpdatePrompt Component
 * Shows a beautiful toast notification when a new PWA version is available.
 * Uses the service worker update callback from vite-plugin-pwa.
 */
function UpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateSW, setUpdateSW] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Dynamic import to avoid SSR issues and only load when needed
    import('virtual:pwa-register').then(({ registerSW }) => {
      const update = registerSW({
        immediate: true,
        onNeedRefresh() {
          setShowUpdate(true);
        },
        onOfflineReady() {
          // Silently ready for offline — no UI needed
          console.log('[PWA] Offline ready');
        },
      });
      setUpdateSW(() => update);
    });
  }, []);

  const handleUpdate = async () => {
    if (!updateSW) return;
    setIsUpdating(true);
    try {
      await updateSW(true);
      // Force reload after SW update
      window.location.reload();
    } catch (err) {
      console.error('[PWA] Update failed:', err);
      // Fallback: hard reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div className="update-prompt-overlay">
      <div className="update-prompt-toast">
        <div className="update-prompt-icon">
          <Sparkles size={24} />
        </div>
        <div className="update-prompt-content">
          <h4 className="update-prompt-title">Update Tersedia! ✨</h4>
          <p className="update-prompt-desc">
            NgopiGak versi baru sudah siap. Refresh untuk menikmati fitur terbaru.
          </p>
        </div>
        <div className="update-prompt-actions">
          <button
            className="update-btn-refresh"
            onClick={handleUpdate}
            disabled={isUpdating}
          >
            <RefreshCw size={16} className={isUpdating ? 'spin' : ''} />
            {isUpdating ? 'Updating...' : 'Refresh'}
          </button>
          <button
            className="update-btn-dismiss"
            onClick={handleDismiss}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdatePrompt;
