import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const TOKEN_KEY = 'vb_token';
const USER_KEY  = 'vb_user';
const TEAM_KEY  = 'vb_team';

export function AuthProvider({ children }) {
  const [token, setToken]               = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user,  setUser]                = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  });
  const [selectedTeam, setSelectedTeam] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TEAM_KEY)); } catch { return null; }
  });
  const [loading, setLoading]           = useState(true);

  // Verifica il token al mount (può essere scaduto)
  useEffect(() => {
    if (!token) { setLoading(false); return; }

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        setUser(data);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
      })
      .catch(() => {
        // Token scaduto o invalido → logout
        logout();
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    localStorage.removeItem(TEAM_KEY);
    setToken(newToken);
    setUser(newUser);
    setSelectedTeam(null);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TEAM_KEY);
    setToken(null);
    setUser(null);
    setSelectedTeam(null);
  }, []);

  const selectTeam = useCallback((team) => {
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
    setSelectedTeam(team);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, isAuthenticated: !!token, selectedTeam, selectTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve essere usato dentro AuthProvider');
  return ctx;
}
