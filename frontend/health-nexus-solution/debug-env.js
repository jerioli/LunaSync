// Debug script to test environment detection
// Add this temporarily to your main.tsx or App.tsx to see what's happening

console.log('🔍 Environment Debug Information:');
console.log('Current URL:', window.location.href);
console.log('Hostname:', window.location.hostname);
console.log('Port:', window.location.port);
console.log('Protocol:', window.location.protocol);

import { ENV } from './config/env';
console.log('Detected ENV.API_URL:', ENV.API_URL);
console.log('Detected ENV.IS_PRODUCTION:', ENV.IS_PRODUCTION);
console.log('Detected ENV.IS_DEVELOPMENT:', ENV.IS_DEVELOPMENT);

// Test the API URL generation manually
if (window.location.hostname === 'lunasync.site') {
  console.log('✅ Should use: https://lunasync.site/api');
} else if (window.location.hostname === 'localhost') {
  console.log('✅ Should use: http://localhost:8000/api');
} else {
  console.log('⚠️ Unknown environment, using:', ENV.API_URL);
}