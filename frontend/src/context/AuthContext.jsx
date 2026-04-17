import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('viksit_token'));
  const [loading, setLoading] = useState(true);

  // Initialize Axios Interceptors
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const storedToken = localStorage.getItem('viksit_token');
        if (storedToken) {
          config.headers['Authorization'] = `Bearer ${storedToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const checkAuth = async () => {
      const storedToken = localStorage.getItem('viksit_token');
      const storedUser = localStorage.getItem('viksit_user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    
    checkAuth();
    
    return () => axios.interceptors.request.eject(requestInterceptor);
  }, []);

  const login = (userData, userToken) => {
    localStorage.setItem('viksit_token', userToken);
    localStorage.setItem('viksit_user', JSON.stringify(userData));
    setToken(userToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('viksit_token');
    localStorage.removeItem('viksit_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
