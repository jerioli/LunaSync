// Environment configuration - Production-first approach
const getApiUrl = () => {
  // For production builds, always use production API
  if (import.meta.env.PROD) {
    console.log('🚀 Production build - using lunasync.site API');
    return 'https://lunasync.site/api';
  }
  
  // For development, check runtime environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    console.log(`🌐 Environment Detection for hostname: "${hostname}"`);
    
    // Only use localhost for development (when actually running on localhost)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('💻 Development environment (localhost only)');
      return 'http://localhost:8000/api';
    }
    
    // For ANY other domain (including lunasync.site), use production
    console.log('🚀 Production environment - using lunasync.site API');
    return 'https://lunasync.site/api';
  }
  
  // Server-side: always default to production
  return 'https://lunasync.site/api';
};

export const ENV = {
  API_URL: getApiUrl(),
  IS_PRODUCTION: typeof window !== 'undefined' && 
                 (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'),
  IS_DEVELOPMENT: typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
};

// Make ENV available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).ENV = ENV;
} // Build timestamp: Wed Oct 29 01:53:48 AM UTC 2025
