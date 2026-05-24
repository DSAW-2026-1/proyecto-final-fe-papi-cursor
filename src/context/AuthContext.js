import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return context;
};

// Accepts both role:'seller' (string) and roles:['seller'] (array) from the API
const hasRole = (user, role) => {
  if (!user) return false;
  if (Array.isArray(user.roles)) return user.roles.includes(role);
  return user.role === role;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login({ email, password });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true, user };
    } catch (error) {
      const data = error.response?.data || {};
      return {
        success: false,
        error: data.error || 'Error al iniciar sesión',
        suspended: data.suspended || false,
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      await authService.register({ name, email, password });
      // Auto-login after successful registration
      const loginResp = await authService.login({ email, password });
      const { token, user } = loginResp.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Error al registrarse' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const becomeSeller = async () => {
    try {
      const response = await authService.becomeSeller();
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Error al convertirse en vendedor' };
    }
  };

  const leaveSeller = async () => {
    try {
      const response = await authService.leaveSeller();
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Error al dejar de ser vendedor' };
    }
  };

  const updateLocalUser = (updates) => {
    const updated = { ...user, ...updates };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  const isSeller = () => hasRole(user, 'seller');
  const isAdmin = () => hasRole(user, 'admin');

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    becomeSeller,
    leaveSeller,
    updateLocalUser,
    isSeller,
    isAdmin,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
