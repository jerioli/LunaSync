export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
};

// Make ENV available globally
if (typeof window !== 'undefined') {
  (window as any).ENV = ENV;
} 