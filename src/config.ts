// API Configuration
// In Expo SDK 54+, EXPO_PUBLIC_* variables are available at process.env during build
// They are statically replaced at build time, not runtime
// So we must use them directly, not via a function

// This will be replaced at build time by Metro bundler
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.jktaxitamilnadu.com';

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: 30000,
};

// Debug: Log the resolved API URL
console.log('📡 [CONFIG] API_URL resolved to:', API_URL);

// For local testing, update .env with:
// EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
// Then restart: npm start --clear
