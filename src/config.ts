const API_URL = 'https://api.jktaxitamilnadu.com';

export const API_CONFIG = {
  BASE_URL: API_URL,
  TIMEOUT: 30000,
};

// Debug: Log the resolved API URL
if (typeof __DEV__ !== 'undefined' && __DEV__) console.log('[CONFIG] API_URL resolved to:', API_URL);
