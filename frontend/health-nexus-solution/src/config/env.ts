// Environment configuration for different deployment environments
const getApiUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;
    const fullHost = `${hostname}:${port}`;
    
    console.log(`🌐 Environment Detection:`, {
      hostname,
      port,
      fullHost,
      protocol: window.location.protocol
    });
    
    // Production check: if the host is lunasync.site, use the production API
    if (hostname === 'lunasync.site') {
      console.log('🚀 Production environment detected (lunasync.site)');
      return 'https://lunasync.site/api';
    }
    // Development check: if running on localhost (any port) or 127.0.0.1, use development API
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('💻 Development environment detected (localhost)');
      // For localhost:8080 (frontend), still use backend on port 8000
      return 'http://localhost:8000/api';
    }
    // For other production hosts, use the same origin for API
    else {
      console.log('🌍 Other environment detected, using same origin');
      return `${window.location.protocol}//${window.location.host}/api`;
    }
  }
  
  // For development, use environment variable or default localhost:8000
  const fallbackUrl = import.meta.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  console.log('⚙️ Server-side or fallback API URL:', fallbackUrl);
  return fallbackUrl;
};

export const ENV = {
  API_URL: getApiUrl(),
  IS_PRODUCTION: typeof window !== 'undefined' && 
                 window.location.hostname === 'lunasync.site',
  IS_DEVELOPMENT: typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
};

// Make ENV available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).ENV = ENV;
} 