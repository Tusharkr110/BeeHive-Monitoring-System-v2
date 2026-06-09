import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      let token = null;

      try {
        if (typeof window !== "undefined") {
          token = localStorage.getItem("token");
        }
      } catch (err) {
        console.error("localStorage blocked:", err);
      }

      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          try {
            localStorage.removeItem("token");
          } catch {}
          setUser(null);
          setIsAuthenticated(false);
        }
      }

      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      
      try {
        localStorage.setItem("token", token);
      } catch (err) {
        console.error("Cannot access localStorage");
      }
      setUser(user);
      setIsAuthenticated(true);
      toast.success(`Welcome back, ${user.name}!`);
      
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (userData) => {
    console.log("REGISTER CALLED");
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      
      try {
        localStorage.setItem("token", token);
      } catch (err) {
        console.error("Cannot access localStorage");
      }
      setUser(user);
      setIsAuthenticated(true);
      toast.success('Account created successfully!');
      
      return { success: true, user };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    try {
      localStorage.removeItem("token");
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
