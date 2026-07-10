import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Loader from '../components/Loader';
import { api } from '../utils/api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/api';
import { requestPermissionAndSubscribe, unsubscribePush } from '../utils/pushNotifications';

const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded || !decoded.exp) return true;
    return decoded.exp * 1000 < Date.now();
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(typeof window === 'undefined' ? false : true);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [announcementEvent, setAnnouncementEvent] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      if (isTokenExpired(storedToken)) {
        console.warn("Auth: Stored token is expired, clearing session");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error("Error parsing user data from localStorage:", error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }
    setLoading(false);
  }, []);


  const refreshUnreadAnnouncements = useCallback(async () => {
    const activeToken = localStorage.getItem('token');

    if (!activeToken) {
      setUnreadAnnouncements(0);
      return;
    }

    try {
      const data = await api.get('/user/announcements/unread-count');
      setUnreadAnnouncements(Number(data?.count) || 0);
    } catch (error) {
      console.error('Failed to refresh unread announcements', error);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setUnreadAnnouncements(0);
      return;
    }

    refreshUnreadAnnouncements();
  }, [token, refreshUnreadAnnouncements]);

  useEffect(() => {
    if (!token || !user?.id) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('join_user', user.id);
    });

    socket.on('announcement_created', ({ announcement }) => {
      setAnnouncementEvent({
        announcement,
        receivedAt: Date.now(),
      });
      refreshUnreadAnnouncements();
    });

    return () => {
      socket.disconnect();
    };
  }, [token, user?.id, refreshUnreadAnnouncements]);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    // Push subscription is handled by NotificationPermissionBanner on the dashboard.
    // We do NOT auto-prompt here to avoid the double-dialog UX issue.
  };

  const logout = () => {
    // Unsubscribe from push notifications
    unsubscribePush().catch(() => {});

    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setUnreadAnnouncements(0);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, unreadAnnouncements, refreshUnreadAnnouncements, announcementEvent }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
            <Loader />
        </div>
      ) : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
