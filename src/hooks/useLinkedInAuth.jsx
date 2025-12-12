import { useState, useEffect, useCallback } from 'react';
import { getToken, getUser, clearToken, getAuthorizationUrl } from '@/config/linkedin';

export function useLinkedInAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier l'état d'authentification au chargement
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(() => {
    setIsLoading(true);
    const storedToken = getToken();
    const storedUser = getUser();
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setToken(null);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(() => {
    const authUrl = getAuthorizationUrl();
    window.location.href = authUrl;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
  }, []);

  return {
    isAuthenticated,
    user,
    token,
    isLoading,
    login,
    logout,
    checkAuth,
  };
}




