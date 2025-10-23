// Environment configuration for different deployment environments
const getApiUrl = () => {
  // Check if we're in browser environment
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    console.log(`🌐 Environment Detection for hostname: "${hostname}"`);
    
    // Force production for lunasync.site
    if (hostname.includes('lunasync')) {
      console.log('🚀 FORCE: Production environment (lunasync.site)');
      return 'https://lunasync.site/api';
    }
    // Development only for exact localhost
    else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      console.log('💻 Development environment (localhost)');
      return 'http://localhost:8000/api';
    }
    // Default to production for any other domain
    else {
      console.log('🌍 Unknown domain, defaulting to production');
      return 'https://lunasync.site/api';
    }
  }
  
  // Server-side: default to production
  return 'https://lunasync.site/api';
};

export const ENV = {
  API_URL: getApiUrl(),
  IS_PRODUCTION: typeof window !== 'undefined' && 
                 (window.location.hostname === 'lunasync.site' || 
                  window.location.hostname === 'www.lunasync.site' || 
                  window.location.hostname.includes('lunasync.site')),
  IS_DEVELOPMENT: typeof window !== 'undefined' && 
                  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
};

// Make ENV available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).ENV = ENV;
} 