import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'https://navigo-1-z7ne.onrender.com/api';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'customer' | 'driver' | 'motorist' | 'admin';
  phoneVerified: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'approved' | 'rejected';
  socialProvider?: string;
  isFemaleDriver?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  error: string | null;
  login: (phone: string, password: string) => Promise<any>;
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

  // Track user activity for session timeout
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => setLastActivity(Date.now());
    events.forEach(e => window.addEventListener(e, handleActivity));
    return () => events.forEach(e => window.removeEventListener(e, handleActivity));
  }, []);

  // Check session timeout
  useEffect(() => {
    if (!user || isGuest) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > SESSION_TIMEOUT) {
        console.log('Session expired due to inactivity');
        logout();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [user, isGuest, lastActivity]);

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
        // Verify token is still valid with backend
        axios.get(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${savedToken}` } })
          .catch(() => { /* Token expired, user can still use app offline */ });
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
    localStorage.setItem('navigo_token', authToken);
    localStorage.setItem('navigo_user', JSON.stringify(userData));
    localStorage.removeItem('navigo_guest');
  }, []);

  const handleApiError = (err: any, defaultMessage: string) => {
    const message = err.response?.data?.message || err.message || defaultMessage;
    setError(message);
    throw new Error(message);
  };

  const login = async (identifier: string, password: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { identifier: identifier.trim(), password });
      saveSession(response.data.user, response.data.token);
      return response.data;
    } catch (err: any) {
      throw handleApiError(err, 'Login failed. Please check your credentials.');
    }
  };

  const register = async (name: string, phone: string, password: string, email?: string, role: string = 'customer') => {
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');
      const response = await axios.post(`${API_URL}/auth/register`, { 
        name: name.trim(), phone: cleanPhone, password, email: email?.trim() || undefined, role 
      });
      saveSession(response.data.user, response.data.token);
    } catch (err: any) {
      throw handleApiError(err, 'Registration failed. Please try again.');
    }
  };

  const socialLogin = async (provider: string, socialId: string, name: string, email?: string, phone?: string): Promise<any> => {
    try {
      const response = await axios.post(`${API_URL}/auth/social-login`, { provider, socialId, name, email, phone });
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
    localStorage.removeItem('navigo_token');
    localStorage.removeItem('navigo_user');
    localStorage.removeItem('navigo_guest');
  }, []);

  const forgotPassword = async (phone: string): Promise<string> => {
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');
      const response = await axios.post(`${API_URL}/auth/forgot-password`, { phone: cleanPhone });
      return response.data.devCode || '';
    } catch (err: any) {
      throw handleApiError(err, 'Failed to send reset code. Please try again.');
    }
  };

  const resetPassword = async (phone: string, code: string, newPassword: string) => {
    try {
      const cleanPhone = phone.replace(/\s+/g, '').replace('+256', '0');
      await axios.post(`${API_URL}/auth/reset-password`, { phone: cleanPhone, code, newPassword });
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
    </AuthContext.Provider>
  );
};

export default AuthContext;