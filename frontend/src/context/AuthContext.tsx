import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from '../services/api';

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SESSION_WARNING = 25 * 60 * 1000; // warn at 25 min

interface User {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: 'rider' | 'driver' | 'admin' | 'customer' | 'motorist';
  phoneVerified: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'approved' | 'rejected';
  socialProvider?: string;
  isFemaleDriver?: boolean;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<any>;
  register: (name: string, phone: string, password: string, email?: string, role?: string) => Promise<void>;
  socialLogin: (provider: string, socialId: string, name: string, email?: string, phone?: string) => Promise<any>;
  logout: () => void;
  forgotPassword: (phone: string) => Promise<string>;
  resetPassword: (phone: string, code: string, newPassword: string) => Promise<void>;
  continueAsGuest: () => void;
  updateUser: (userData: Partial<User>) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);

  // Track user activity for session timeout
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => {
      setLastActivity(Date.now());
      setShowTimeoutWarning(false);
    };
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handleActivity));
  }, []);

  // Check session timeout with warning
  useEffect(() => {
    if (!user || isGuest) return;
    const interval = setInterval(() => {
      const inactive = Date.now() - lastActivity;
      if (inactive > SESSION_TIMEOUT) {
        console.log('Session expired due to inactivity');
        logout();
      } else if (inactive > SESSION_WARNING && !showTimeoutWarning) {
        setShowTimeoutWarning(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [user, isGuest, lastActivity, showTimeoutWarning]);

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('navigo_token');
    const savedUser = localStorage.getItem('navigo_user');
    const savedGuest = localStorage.getItem('navigo_guest');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        // Verify token is still valid — using central api instance (benefits from interceptors)
        api.get(`/auth/me`).catch(() => {
          // Token expired but keep user for offline display; api interceptor will redirect on 401
          console.warn('Token verification failed — may be expired');
        });
      } catch {
        localStorage.removeItem('navigo_token');
        localStorage.removeItem('navigo_user');
      }
    } else if (savedGuest === 'true') {
      setIsGuest(true);
    }
    setIsLoading(false);
  }, []);

  const saveSession = useCallback((userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setIsGuest(false);
    setError(null);
    setLastActivity(Date.now());
    setShowTimeoutWarning(false);
    localStorage.setItem('navigo_token', authToken);
    localStorage.setItem('navigo_user', JSON.stringify(userData));
    localStorage.removeItem('navigo_guest');
  }, []);

  const handleApiError = (err: any, defaultMessage: string) => {
    const message = err.response?.data?.message || err.message || defaultMessage;
    setError(message);
    throw new Error(message);
  };

  const normalizePhone = (phone: string) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('256')) cleaned = cleaned.slice(3);
    if (cleaned.length === 9 && cleaned.startsWith('7')) cleaned = '0' + cleaned;
    return cleaned;
  };

  const login = async (identifier: string, password: string): Promise<any> => {
    try {
      const trimmed = identifier.trim();
      const response = await api.post(`/auth/login`, { identifier: trimmed, password });
      saveSession(response.data.user, response.data.token);
      return response.data;
    } catch (err: any) {
      throw handleApiError(err, 'Login failed. Please check your credentials.');
    }
  };

  const register = async (name: string, phone: string, password: string, email?: string, role: string = 'rider') => {
    try {
      const cleanPhone = normalizePhone(phone);
      if (!/^07\d{8}$/.test(cleanPhone)) {
        throw new Error('Invalid phone number. Use format 07... (e.g. 0772000000)');
      }
      const response = await api.post(`/auth/register`, {
        fullName: name.trim(),
        phone: cleanPhone,
        password,
        email: email?.trim() || undefined,
        role
      });
      saveSession(response.data.user, response.data.token);
    } catch (err: any) {
      throw handleApiError(err, 'Registration failed. Please try again.');
    }
  };

  const socialLogin = async (provider: string, socialId: string, name: string, email?: string, phone?: string): Promise<any> => {
    try {
      const response = await api.post(`/auth/social-login`, { provider, socialId, name, email, phone });
      saveSession(response.data.user, response.data.token);
      return response.data;
    } catch (err: any) {
      throw handleApiError(err, `${provider} login failed. Please try again.`);
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsGuest(false);
    setError(null);
    setShowTimeoutWarning(false);
    localStorage.removeItem('navigo_token');
    localStorage.removeItem('navigo_user');
    localStorage.removeItem('navigo_guest');
    localStorage.removeItem('navigo_onboarding_complete');
  }, []);

  const forgotPassword = async (phone: string): Promise<string> => {
    try {
      const cleanPhone = normalizePhone(phone);
      const response = await api.post(`/auth/forgot-password`, { phone: cleanPhone });
      return response.data.devCode || '';
    } catch (err: any) {
      throw handleApiError(err, 'Failed to send reset code. Please try again.');
    }
  };

  const resetPassword = async (phone: string, code: string, newPassword: string) => {
    try {
      const cleanPhone = normalizePhone(phone);
      await api.post(`/auth/reset-password`, { phone: cleanPhone, code, newPassword });
    } catch (err: any) {
      throw handleApiError(err, 'Password reset failed. Please check your code and try again.');
    }
  };

  const continueAsGuest = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsGuest(true);
    setError(null);
    localStorage.setItem('navigo_guest', 'true');
    localStorage.removeItem('navigo_token');
    localStorage.removeItem('navigo_user');
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...userData };
      localStorage.setItem('navigo_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user, token, isAuthenticated: !!user, isGuest, isLoading, error,
        login, register, socialLogin, logout, forgotPassword, resetPassword,
        continueAsGuest, updateUser, clearError
      }}>
      {children}
      {showTimeoutWarning && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,107,53,0.95)', color: '#fff', padding: '12px 20px',
          borderRadius: 12, fontSize: 13, fontWeight: 600, zIndex: 9999,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', display: 'flex', gap: 12, alignItems: 'center'
        }}>
          <span>Session expiring soon due to inactivity</span>
          <button onClick={() => setLastActivity(Date.now())} style={{
            background: '#fff', color: '#FF6B35', border: 'none', borderRadius: 8,
            padding: '6px 12px', fontWeight: 700, cursor: 'pointer', fontSize: 12
          }}>Stay Logged In</button>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
