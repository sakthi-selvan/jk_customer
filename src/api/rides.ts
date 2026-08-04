import apiClient from './client';
import { Ride, CreateRideData, PaymentData } from '../types';

export const ridesApi = {
  // Create new ride booking
  createRide: async (data: CreateRideData): Promise<Ride> => {
    const response = await apiClient.post<Ride>('/api/bookings', data);
    return response.data;
  },

  // Get active ride
  getActiveRide: async (): Promise<Ride> => {
    const response = await apiClient.get<Ride>('/api/bookings/active');
    return response.data;
  },

  // Get ride by ID
  getRide: async (rideId: string): Promise<Ride> => {
    const response = await apiClient.get<Ride>(`/api/bookings/${rideId}`);
    return response.data;
  },

  // Cancel ride
  cancelRide: async (rideId: string): Promise<Ride> => {
    const response = await apiClient.put<Ride>(`/api/bookings/${rideId}/cancel`);
    return response.data;
  },

  // Process payment
  processPayment: async (data: PaymentData): Promise<any> => {
    const response = await apiClient.post(`/api/bookings/${data.ride_id}/payment`, data);
    return response.data;
  },

  // Get ride history
  getRideHistory: async (): Promise<Ride[]> => {
    const response = await apiClient.get<Ride[]>('/api/bookings/history/all');
    return response.data;
  },
};
