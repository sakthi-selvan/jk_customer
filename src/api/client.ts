import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../config';
import { router } from 'expo-router';
import storage from '../utils/storage';
import { connectivity } from '../services/connectivity';

const IS_DEV = typeof __DEV__ !== 'undefined' ? __DEV__ : false;

function logDev(...args: any[]) {
  if (IS_DEV) console.log(...args);
}

class ApiClient {
  private client: AxiosInstance;
  private inMemoryToken: string | null = null;
  private logoutCallback: (() => void) | null = null;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.request.use(
      async (config) => {
        logDev('[API]', config.method?.toUpperCase(), config.url);
        try {
          const token = await storage.getItem('access_token');
          if (token) {
            this.inMemoryToken = token;
            config.headers.Authorization = `Bearer ${token}`;
          } else if (this.inMemoryToken) {
            config.headers.Authorization = `Bearer ${this.inMemoryToken}`;
          }
        } catch {
          if (this.inMemoryToken) {
            config.headers.Authorization = `Bearer ${this.inMemoryToken}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => {
        // Any HTTP response means the app can reach the API
        connectivity.noteReachable();
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Server answered (incl. 404 "no active ride") → we are NOT offline
        if (error.response) {
          connectivity.noteReachable();
        } else {
          connectivity.noteUnreachable();
        }

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (originalRequest.url?.includes('/auth/refresh')) {
            await this.handleLogout();
            return Promise.reject(error);
          }

          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = await storage.getItem('refresh_token');
            if (!refreshToken) throw new Error('No refresh token');

            const response = await axios.post(
              `${API_CONFIG.BASE_URL}/api/auth/refresh`,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            const { access_token, refresh_token: newRefreshToken } = response.data;
            this.inMemoryToken = access_token;
            await storage.setItem('access_token', access_token);
            await storage.setItem('refresh_token', newRefreshToken);

            this.failedQueue.forEach(({ resolve }) => resolve(access_token));
            this.failedQueue = [];

            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError));
            this.failedQueue = [];
            await this.handleLogout();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // 404 on /active = no ride booked — expected, not an API/network failure
        const isNoActiveRide =
          error.response?.status === 404 &&
          !!error.config?.url?.includes('/bookings/active');
        if (!isNoActiveRide && error.response?.status !== 401 && IS_DEV) {
          console.warn('[API ERROR]', error.response?.status, error.config?.url);
        }

        return Promise.reject(error);
      }
    );
  }

  private async handleLogout() {
    this.inMemoryToken = null;
    try {
      await storage.multiRemove(['access_token', 'refresh_token', 'user']);
    } catch {
      // ignore
    }
    if (this.logoutCallback) this.logoutCallback();
    try {
      router.replace('/login');
    } catch {
      // ignore
    }
  }

  public setLogoutCallback(callback: () => void) {
    this.logoutCallback = callback;
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  public setBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }

  public setToken(token: string) {
    this.inMemoryToken = token;
  }

  public clearToken() {
    this.inMemoryToken = null;
  }
}

const apiClientInstance = new ApiClient();
export const setLogoutCallback = (cb: () => void) => apiClientInstance.setLogoutCallback(cb);
export const setApiToken = (token: string) => apiClientInstance.setToken(token);
export const clearApiToken = () => apiClientInstance.clearToken();
export default apiClientInstance.getClient();
