import React, { createContext, useState, useEffect, useCallback } from 'react';
import { getToken, setToken, deleteToken } from '../services/tokenStorage';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load tokens on app startup
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const access = await getToken('accessToken');
        if (access) {
          setUserToken(access);
        }
      } catch (e) {
        console.error('Failed to load tokens:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadTokens();
  }, []);

  const login = useCallback(async (accessToken, refreshToken) => {
    await setToken('accessToken', accessToken);
    await setToken('refreshToken', refreshToken);
    setUserToken(accessToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = await getToken('refreshToken');
      if (refreshToken) {
        await api.post('/api/logout/', { refresh: refreshToken });
      }
    } catch (e) {
      console.warn('Server logout failed:', e.message);
    } finally {
      await deleteToken('accessToken');
      await deleteToken('refreshToken');
      setUserToken(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, userToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
