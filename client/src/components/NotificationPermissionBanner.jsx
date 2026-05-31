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
    // 2. Permission is not yet granted
    // 3. User hasn't permanently dismissed it
    if (!('Notification' in window) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    if (localStorage.getItem(DISMISS_KEY) === 'true') return;

    // Show after a short delay so it doesn't flash immediately on load
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
    <div style={styles.overlay}>
      <div style={styles.banner}>
        {/* Animated bell icon */}
        <div style={styles.iconWrap}>
          <span style={styles.bell}>🔔</span>
        </div>

        <div style={styles.textWrap}>
          {status === 'success' ? (
            <>
              <p style={styles.title}>✅ Notifications Enabled!</p>
              <p style={styles.sub}>You'll get match reminders and announcements.</p>
            </>
          ) : status === 'denied' ? (
            <>
              <p style={styles.title}>Notifications Blocked</p>
              <p style={styles.sub}>
                Enable them in your browser settings to get match alerts.
              </p>
            </>
          ) : status === 'error' ? (
            <>
              <p style={styles.title}>Something went wrong</p>
              <p style={styles.sub}>Could not enable notifications. Try again later.</p>
            </>
          ) : (
            <>
              <p style={styles.title}>Enable Match Notifications</p>
              <p style={styles.sub}>
                Get real-time alerts for fixtures, reminders &amp; announcements — even when this tab is closed.
              </p>
            </>
          )}
        </div>

        {!status && (
          <div style={styles.actions}>
            <button
              id="enable-push-btn"
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleEnable}
              disabled={loading}
            >
              {loading ? (
                <span style={styles.spinner} />
              ) : (
                'Allow'
              )}
            </button>
            <button
              id="dismiss-push-btn"
              style={{ ...styles.btn, ...styles.btnSecondary }}
              onClick={handleDismiss}
            >
              Not Now
            </button>
          </div>
        )}

        {/* Close X */}
        {(status === 'success' || status === 'denied' || status === 'error') && (
          <button
            onClick={() => setVisible(false)}
            style={styles.closeBtn}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    width: 'min(420px, calc(100vw - 32px))',
    animation: 'slideUpBanner 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both',
  },
  banner: {
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    border: '1px solid rgba(99, 102, 241, 0.4)',
    borderRadius: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    backdropFilter: 'blur(20px)',
    position: 'relative',
  },
  iconWrap: {
    flexShrink: 0,
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    background: 'rgba(99, 102, 241, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(99, 102, 241, 0.3)',
  },
  bell: {
    fontSize: '22px',
    display: 'block',
    animation: 'bellRing 1.5s ease-in-out infinite',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: '#f1f5f9',
    letterSpacing: '0.01em',
    lineHeight: 1.3,
  },
  sub: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexShrink: 0,
  },
  btn: {
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    letterSpacing: '0.03em',
    minWidth: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.05)',
    color: '#94a3b8',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  closeBtn: {
    position: 'absolute',
    top: '10px',
    right: '12px',
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 4px',
    lineHeight: 1,
  },
  spinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
};
