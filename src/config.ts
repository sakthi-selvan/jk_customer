import { Platform } from 'react-native';

// API Configuration
// In Expo SDK 54+, EXPO_PUBLIC_* variables are available at process.env during build
// They are statically replaced at build time, not runtime
// So we must use them directly, not via a function

function isLoopbackOrEmulatorHost(url: string) {
  return /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(url);
}

function resolveApiUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

  if (!isDev) {
    return configuredUrl || 'https://api.jktaxitamilnadu.com';
  }

  // Physical devices: set EXPO_PUBLIC_API_URL to your PC's LAN IP in .env
  if (configuredUrl && !isLoopbackOrEmulatorHost(configuredUrl)) {
    return configuredUrl;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000';
  }

  if (Platform.OS === 'ios') {
    return 'http://127.0.0.1:8000';
  }

  return configuredUrl || 'http://127.0.0.1:8000';
}

const API_URL = resolveApiUrl();

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: 30000,
};

// Debug: Log the resolved API URL
console.log('📡 [CONFIG] API_URL resolved to:', API_URL);

// For local testing, update .env with:
// EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
// For Android emulator, the default is http://10.0.2.2:8000.
// Then restart: npm start --clear
