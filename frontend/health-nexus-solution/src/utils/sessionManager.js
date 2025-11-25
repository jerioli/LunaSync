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

// NOTE: Removed global axios interceptor to prevent conflicts with axiosInstance
// Session timeout handling is now managed by the axiosInstance in api.ts

// Function to show session expired modal
function showSessionExpiredModal() {
  // Remove any existing modal
  const existingModal = document.getElementById('session-expired-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'session-expired-modal';
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
    backdrop-filter: blur(4px);
  `;

  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    padding: 32px;
    border-radius: 12px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    text-align: center;
    animation: slideIn 0.3s ease-out;
  `;

  modalContent.innerHTML = `
    <style>
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
    <div style="font-size: 48px; margin-bottom: 16px;">⏰</div>
    <h2 style="font-size: 24px; font-weight: 700; color: #1f2937; margin-bottom: 12px;">
      Session Expired
    </h2>
    <p style="font-size: 16px; color: #6b7280; margin-bottom: 24px; line-height: 1.5;">
      Your session has timed out for security reasons. Please log in again to continue.
    </p>
    <button id="session-expired-btn" style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 16px;
      font-weight: 600;
      padding: 12px 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(102, 126, 234, 0.5)';" 
       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)';">
      Go to Login
    </button>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Add click handler to button
  const button = document.getElementById('session-expired-btn');
  if (button) {
    button.addEventListener('click', () => {
      modalOverlay.remove();
      window.location.href = '/login';
    });
  }

  // Auto-redirect after 5 seconds
  setTimeout(() => {
    if (document.getElementById('session-expired-modal')) {
      modalOverlay.remove();
      window.location.href = '/login';
    }
  }, 5000);
}

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