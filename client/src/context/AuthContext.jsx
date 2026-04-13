import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const AuthContext = createContext(null);

const fetchJSON = async (path, options = {}) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'Request failed');
  return data;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const data = await fetchJSON('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const data = await fetchJSON('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setUser(data.user);
    return data.user;
  }, []);

  const signup = useCallback(async ({ email, password }) => {
    const data = await fetchJSON('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await fetchJSON('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }, []);

  useEffect(() => {
    refreshSession().finally(() => setLoading(false));
  }, [refreshSession]);

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshSession }),
    [user, loading, login, signup, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
};
