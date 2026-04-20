import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Loader from '../components/Loader';
import { api } from '../utils/api';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState(0);
  const [announcementEvent, setAnnouncementEvent] = useState(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
  };

  const logout = () => {
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
