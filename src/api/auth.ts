import apiClient from './client';
import { User, AuthResponse } from '../types';

export interface OTPAuthResponse extends AuthResponse {
  is_new_user: boolean;
}

export const authApi = {
  // Send OTP to phone number
  sendOTP: async (phone: string): Promise<{ message: string; otp_length: number }> => {
    const response = await apiClient.post('/api/auth/send-otp', { phone });
    return response.data;
  },

  // Verify OTP and get tokens
  verifyOTP: async (phone: string, otp: string): Promise<OTPAuthResponse> => {
    const response = await apiClient.post<OTPAuthResponse>('/api/auth/verify-otp', { phone, otp });
    return response.data;
  },

  // Complete profile for new users
  completeProfile: async (data: {
    name: string;
    email?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.put('/api/auth/complete-profile', data);
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/api/user/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: Partial<User>): Promise<User> => {
    const response = await apiClient.put<User>('/api/user/profile', data);
    return response.data;
  },
};
