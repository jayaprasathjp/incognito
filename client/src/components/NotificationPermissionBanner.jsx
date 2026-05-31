import { useState, useEffect } from 'react';
import { requestPermissionAndSubscribe, getNotificationPermission } from '../utils/pushNotifications';

const DISMISS_KEY = 'push_banner_dismissed';

export default function NotificationPermissionBanner() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(''); // 'success' | 'denied' | 'error' | ''

  useEffect(() => {
    // Only show the banner if:
    // 1. Browser supports push
    // 2. Permission is not yet asked ('default')
    // 3. User hasn't permanently dismissed it
    if (!('Notification' in window) || !('PushManager' in window)) return;

    // Already denied → nothing we can do, don't show banner
    if (Notification.permission === 'denied') return;

    if (Notification.permission === 'granted') {
      // Permission was already granted (e.g. user re-logged in).
      // Re-subscribe silently — no banner needed.
      if (!localStorage.getItem('push_subscribed')) {
        requestPermissionAndSubscribe().catch(() => {});
      }
      return;
    }

    // permission === 'default' — show the banner after a short delay
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    const result = await requestPermissionAndSubscribe();
    setLoading(false);

    if (result === 'granted') {
      setStatus('success');
      setTimeout(() => setVisible(false), 2500);
    } else if (result === 'denied') {
      setStatus('denied');
      setTimeout(() => setVisible(false), 3000);
    } else {
      setStatus('error');
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="push-banner-overlay">
      <div className="push-banner-card">
        {/* Banner Header with Bell & Title */}
        <div className="push-banner-header">
          <div className="push-banner-icon-wrap">
            <span className="push-banner-bell">🔔</span>
          </div>
          <h4 className="push-banner-title">
            {status === 'success' && "Notifications Enabled!"}
            {status === 'denied' && "Notifications Blocked"}
            {status === 'error' && "Something went wrong"}
            {!status && "Enable Match Notifications"}
          </h4>
        </div>

        {/* Banner Body with details */}
        <div className="push-banner-body">
          <p className="push-banner-sub">
            {status === 'success' && "✅ You'll get match reminders and announcements."}
            {status === 'denied' && "Please enable notifications in your browser settings to receive match alerts."}
            {status === 'error' && "Could not enable notifications. Please try again later."}
            {!status && (
              <>
                Tap <strong style={{ color: '#a5b4fc' }}>Allow</strong> below, then confirm in the browser popup that appears — and you'll get match reminders &amp; announcements even when this tab is closed.
              </>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        {!status && (
          <div className="push-banner-actions">
            <button
              id="dismiss-push-btn"
              className="push-banner-btn push-banner-btn-secondary"
              onClick={handleDismiss}
            >
              Not Now
            </button>
            <button
              id="enable-push-btn"
              className="push-banner-btn push-banner-btn-primary"
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? (
                <span className="push-banner-spinner" />
              ) : (
                'Allow'
              )}
            </button>
          </div>
        )}

        {/* Close Button for status alerts */}
        {(status === 'success' || status === 'denied' || status === 'error') && (
          <button
            onClick={() => setVisible(false)}
            className="push-banner-close-btn"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
