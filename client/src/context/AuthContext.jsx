import React, { createContext, useContext, useState, useEffect } from 'react';
import { safeFetchJson } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Check current user on mount
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userData = await safeFetchJson('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        setUser(userData);
      } catch (err) {
        console.error('Auth verification failed:', err.message);
        if (err.status === 401 || err.status === 403) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    const data = await safeFetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (name, email, password, role) => {
    const data = await safeFetchJson('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role })
    });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };


  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Demo auto login helper
  const demoLogin = async (email) => {
    return login(email, 'password123');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
