// Session Management Utilities for Health Nexus Frontend
import axios from 'axios';
import { ENV } from '../config/env.ts';

// Configure axios defaults for session-based authentication
axios.defaults.baseURL = ENV.API_URL;
axios.defaults.withCredentials = true; // Important: Enable cookie handling
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add CSRF token support
axios.defaults.xsrfCookieName = 'csrftoken';
axios.defaults.xsrfHeaderName = 'X-CSRFToken';

// Login with email and password using sessions
export const loginWithSession = async (credentials) => {
  try {
    console.log('🔐 Attempting session login...');
    
    const response = await axios.post('/auth/session-login/', credentials);

    if (response.status === 200 && response.data.success) {
      const data = response.data;
      console.log('✅ Session login successful:', data);
      
      return {
        success: true,
        user: data.user,
        session_id: data.session_id,
        message: data.message,
        force_password_change: data.force_password_change
      };
    } else {
      throw new Error(response.data.error || 'Login failed');
    }
  } catch (error) {
    console.error('❌ Session login failed:', error.response?.data);
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Login failed'
    };
  }
};

// Check current session status
export const checkSessionStatus = async () => {
  try {
    const response = await axios.get('/auth/session-status/');
    const data = response.data;
    
    console.log('📊 Session status response:', {
      status: response.status,
      authenticated: data.authenticated,
      session_id: data.session_id,
      user: data.user ? 'Present' : 'None',
      fullData: data
    });
    
    return data;
  } catch (error) {
    console.error('❌ Session status check failed:', error);
    console.log('Error details:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      code: error.code
    });
    
    // If it's a network error or server error, don't assume session is invalid
    if (error.code === 'NETWORK_ERROR' || error.response?.status >= 500) {
      console.log('🔄 Network/server error, assuming session might still be valid');
      return { authenticated: 'unknown', error: 'network_error' };
    }
    
    // Only return authenticated: false for explicit auth failures
    return { authenticated: false, error: 'auth_failed' };
  }
};

// Validate current session
export const validateSession = async () => {
  try {
    const response = await axios.get('/auth/session-validate/');
    const data = response.data;
    
    console.log('🔍 Session validation:', data);
    return data;
  } catch (error) {
    console.error('❌ Session validation failed:', error.response?.data);
    return { valid: false, error: error.response?.data?.detail };
  }
};

// Logout and clear session
export const logoutSession = async () => {
  try {
    const response = await axios.post('/auth/session-logout/');
    
    console.log('🚪 Session logout successful');
    return response.data;
  } catch (error) {
    console.error('❌ Session logout failed:', error);
    return { success: false, error: 'Logout failed' };
  }
};

// Utility to check if user is authenticated locally
export const isUserAuthenticated = () => {
  const user = localStorage.getItem('user');
  const sessionId = localStorage.getItem('sessionId');
  return user && sessionId;
};

// Utility to get current user from localStorage
export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Utility to clear all authentication data
export const clearAuthData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('sessionId');
  console.log('🧹 Authentication data cleared');
};