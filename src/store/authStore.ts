import { create } from 'zustand';
import storage from '../utils/storage';
import { User } from '../types';
import { authApi, OTPAuthResponse } from '../api/auth';
import { setApiToken, clearApiToken, setLogoutCallback } from '../api/client';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  // OTP flow state
  otpSent: boolean;
  otpPhone: string | null;
  isNewUser: boolean;

  // Actions
  sendOTP: (phone: string) => Promise<void>;
  verifyOTP: (phone: string, otp: string) => Promise<boolean>;
  completeProfile: (name: string, email?: string, emergencyContactName?: string, emergencyContactPhone?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  clearError: () => void;
  resetOTPState: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  setLogoutCallback(() => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      otpSent: false,
      otpPhone: null,
      isNewUser: false,
    });
  });

  return {
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isInitializing: true,
    isLoading: false,
    error: null,
    otpSent: false,
    otpPhone: null,
    isNewUser: false,

    sendOTP: async (phone: string) => {
      try {
        set({ isLoading: true, error: null });
        await authApi.sendOTP(phone);
        set({ otpSent: true, otpPhone: phone, isLoading: false });
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Failed to send OTP',
          isLoading: false,
        });
        throw error;
      }
    },

    verifyOTP: async (phone: string, otp: string) => {
      try {
        set({ isLoading: true, error: null });
        const response: OTPAuthResponse = await authApi.verifyOTP(phone, otp);

        setApiToken(response.access_token);
        await storage.setItem('access_token', response.access_token);
        await storage.setItem('refresh_token', response.refresh_token);

        set({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          isNewUser: response.is_new_user,
        });

        if (!response.is_new_user) {
          const user = await authApi.getProfile();
          await storage.setItem('user', JSON.stringify(user));
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            otpSent: false,
            otpPhone: null,
          });
        } else {
          set({ isLoading: false });
        }

        return response.is_new_user;
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Invalid OTP',
          isLoading: false,
        });
        throw error;
      }
    },

    completeProfile: async (name: string, email?: string, emergencyContactName?: string, emergencyContactPhone?: string) => {
      try {
        set({ isLoading: true, error: null });
        await authApi.completeProfile({
          name,
          email: email || undefined,
          emergency_contact_name: emergencyContactName || undefined,
          emergency_contact_phone: emergencyContactPhone || undefined,
        });

        const user = await authApi.getProfile();
        await storage.setItem('user', JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isNewUser: false,
          otpSent: false,
          otpPhone: null,
        });
      } catch (error: any) {
        set({
          error: error.response?.data?.detail || 'Failed to update profile',
          isLoading: false,
        });
        throw error;
      }
    },

    logout: async () => {
      clearApiToken();
      await storage.multiRemove(['access_token', 'refresh_token', 'user']);
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        otpSent: false,
        otpPhone: null,
        isNewUser: false,
      });
    },

    loadUser: async () => {
      try {
        set({ isInitializing: true });
        const token = await storage.getItem('access_token');
        const userStr = await storage.getItem('user');

        if (token && userStr) {
          const user = JSON.parse(userStr);
          setApiToken(token);
          set({
            user,
            accessToken: token,
            isAuthenticated: true,
            isInitializing: false,
          });
        } else {
          set({ isInitializing: false });
        }
      } catch (error) {
        console.log('⚠️  Storage error during load:', error);
        set({ isInitializing: false });
      }
    },

    clearError: () => set({ error: null }),

    resetOTPState: () => set({ otpSent: false, otpPhone: null, isNewUser: false, error: null }),
  };
});
