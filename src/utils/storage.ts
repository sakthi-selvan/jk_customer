/**
 * Token storage — prefers expo-secure-store when available, else AsyncStorage.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const memoryStorage: { [key: string]: string } = {};
let isAsyncStorageAvailable = true;
let SecureStore: any = null;

try {
  // Optional dependency — installed when available
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = null;
}

const SECURE_KEYS = new Set(['access_token', 'refresh_token']);

(async () => {
  try {
    await AsyncStorage.setItem('__test__', 'test');
    await AsyncStorage.removeItem('__test__');
  } catch {
    isAsyncStorageAvailable = false;
  }
})();

async function setSecure(key: string, value: string) {
  if (SecureStore?.setItemAsync) {
    await SecureStore.setItemAsync(key, value);
    return;
  }
  if (isAsyncStorageAvailable) {
    await AsyncStorage.setItem(key, value);
    return;
  }
  memoryStorage[key] = value;
}

async function getSecure(key: string): Promise<string | null> {
  if (SecureStore?.getItemAsync) {
    return SecureStore.getItemAsync(key);
  }
  if (isAsyncStorageAvailable) {
    return AsyncStorage.getItem(key);
  }
  return memoryStorage[key] || null;
}

async function removeSecure(key: string) {
  if (SecureStore?.deleteItemAsync) {
    await SecureStore.deleteItemAsync(key);
    return;
  }
  if (isAsyncStorageAvailable) {
    await AsyncStorage.removeItem(key);
    return;
  }
  delete memoryStorage[key];
}

export const setItem = async (key: string, value: string): Promise<void> => {
  if (SECURE_KEYS.has(key)) {
    await setSecure(key, value);
    return;
  }
  if (isAsyncStorageAvailable) {
    try {
      await AsyncStorage.setItem(key, value);
      return;
    } catch {
      isAsyncStorageAvailable = false;
    }
  }
  memoryStorage[key] = value;
};

export const getItem = async (key: string): Promise<string | null> => {
  if (SECURE_KEYS.has(key)) {
    return getSecure(key);
  }
  if (isAsyncStorageAvailable) {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      isAsyncStorageAvailable = false;
    }
  }
  return memoryStorage[key] || null;
};

export const removeItem = async (key: string): Promise<void> => {
  if (SECURE_KEYS.has(key)) {
    await removeSecure(key);
    return;
  }
  if (isAsyncStorageAvailable) {
    try {
      await AsyncStorage.removeItem(key);
      return;
    } catch {
      isAsyncStorageAvailable = false;
    }
  }
  delete memoryStorage[key];
};

export const multiRemove = async (keys: string[]): Promise<void> => {
  for (const key of keys) {
    await removeItem(key);
  }
};

export const clear = async (): Promise<void> => {
  await multiRemove(['access_token', 'refresh_token', 'user']);
  if (isAsyncStorageAvailable) {
    try {
      await AsyncStorage.clear();
    } catch {
      isAsyncStorageAvailable = false;
    }
  }
  Object.keys(memoryStorage).forEach((k) => delete memoryStorage[k]);
};

export const getAllKeys = async (): Promise<string[]> => {
  if (isAsyncStorageAvailable) {
    try {
      return await AsyncStorage.getAllKeys();
    } catch {
      isAsyncStorageAvailable = false;
    }
  }
  return Object.keys(memoryStorage);
};

export const isStorageAvailable = (): boolean => isAsyncStorageAvailable;

export default {
  setItem,
  getItem,
  removeItem,
  multiRemove,
  clear,
  getAllKeys,
  isStorageAvailable,
};
