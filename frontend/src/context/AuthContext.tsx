import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

const API_URL = 'https://navigo-api.onrender.com/api';

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: 'rider' | 'driver' | 'motorist' | 'admin';
  phoneVerified: boolean;
  verificationStatus?: 'unverified' | 'pending' | 'approved' | 'rejected';
  socialProvider?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  login: (phone: string, password: string) => Promise<any>;
  register: (name: string, phone: string, password: string, email?: string, role?: string) => Promise<void>;
  socialLogin: (provider: string, socialId: string, name: string, email?: string, phone?: string) => Promise<void>;
  logout: () => void;
  forgotPassword: (phone: string) => Promise<string>;
  resetPassword: (phone: string, code: string, newPassword: string) => Promise<void>;
  continueAsGuest: () => void;
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

  useEffect(() => {
    const savedToken = localStorage.getItem('navigo_token');
    const savedUser = localStorage.getItem('navigo_user');
    const savedGuest = localStorage.getItem('navigo_guest');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else if (savedGuest === 'true') {
      setIsGuest(true);
    }
    setIsLoading(false);
  }, []);

  const saveSession = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    setIsGuest(false);
    localStorage.setItem('navigo_token', authToken);
    localStorage.setItem('navigo_user', JSON.stringify(userData));
    localStorage.removeItem('navigo_guest');
  };

  const login = async (phone: string, password: string) => {
    const response = await axios.post(`${API_URL}/auth/login`, { phone, password });
    saveSession(response.data.user, response.data.token);
    return response.data;
  };

  const register = async (name: string, phone: string, password: string, email?: string, role: string = 'rider') => {
    const response = await axios.post(`${API_URL}/auth/register`, { name, phone, password, email, role });
    saveSession(response.data.user, response.data.token);
  };

  const socialLogin = async (provider: string, socialId: string, name: string, email?: string, phone?: string) => {
    const response = await axios.post(`${API_URL}/auth/social-login`, { provider, socialId, name, email, phone });
    saveSession(response.data.user, response.data.token);
    return response.data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setIsGuest(false);
    localStorage.removeItem('navigo_token');
    localStorage.removeItem('navigo_user');
    localStorage.removeItem('navigo_guest');
  };

  const forgotPassword = async (phone: string): Promise<string> => {
    const response = await axios.post(`${API_URL}/auth/forgot-password`, { phone });
    return response.data.devCode || '';
  };

  const resetPassword = async (phone: string, code: string, newPassword: string) => {
    await axios.post(`${API_URL}/auth/reset-password`, { phone, code, newPassword });
  };

  const continueAsGuest = () => {
    setUser(null);
    setToken(null);
    setIsGuest(true);
    localStorage.setItem('navigo_guest', 'true');
    localStorage.removeItem('navigo_token');
    localStorage.removeItem('navigo_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isGuest,
        isLoading,
        login,
        register,
        socialLogin,
        logout,
        forgotPassword,
        resetPassword,
        continueAsGuest
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;