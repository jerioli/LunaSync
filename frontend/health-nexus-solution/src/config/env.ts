// Environment configuration for different deployment environments
const getApiUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    // Production check: if the host is not localhost, use the same origin for API
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // In production, use the same origin as the frontend
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  }
  
  // For development, use environment variable or default localhost
  return import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
};

export const ENV = {
  API_URL: getApiUrl(),
  IS_PRODUCTION: typeof window !== 'undefined' && 
                 window.location.hostname !== 'localhost' && 
                 window.location.hostname !== '127.0.0.1',
  IS_DEVELOPMENT: typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
};

// Make ENV available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).ENV = ENV;
} 