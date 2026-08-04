import apiClient from './client';
import {
  VehicleCategoryData,
  EnhancedRide,
  FareBreakdown,
  BookingCreateRequest,
  SavedPlaces,
  SavedPlace
} from '../types/enhanced';

export const bookingEnhancedApi = {
  // Get vehicle categories
  getVehicleCategories: async (): Promise<VehicleCategoryData[]> => {
    const response = await apiClient.get<VehicleCategoryData[]>('/api/v2/bookings/vehicle-categories');
    return response.data;
  },

  // Calculate fare estimate
  calculateFare: async (params: {
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number;
    dropoff_lng: number;
    vehicle_category: string;
    trip_type?: string;
    rental_hours?: number;
    scheduled_datetime?: string;
  }): Promise<FareBreakdown> => {
    const response = await apiClient.post<FareBreakdown>(
      '/api/v2/bookings/calculate-fare',
      null,
      { params }
    );
    return response.data;
  },

  // Create booking
  createBooking: async (data: BookingCreateRequest): Promise<EnhancedRide> => {
    const response = await apiClient.post<EnhancedRide>('/api/v2/bookings', data);
    return response.data;
  },

  // Get active ride
  getActiveRide: async (): Promise<EnhancedRide> => {
    const response = await apiClient.get<EnhancedRide>('/api/v2/bookings/active');
    return response.data;
  },

  // Get ride details
  getRide: async (rideId: string): Promise<EnhancedRide> => {
    const response = await apiClient.get<EnhancedRide>(`/api/v2/bookings/${rideId}`);
    return response.data;
  },

  // Cancel ride
  cancelRide: async (rideId: string, reason?: string): Promise<EnhancedRide> => {
    const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
    const response = await apiClient.put<EnhancedRide>(`/api/v2/bookings/${rideId}/cancel${params}`);
    return response.data;
  },

  // Get ride history
  getRideHistory: async (): Promise<EnhancedRide[]> => {
    const response = await apiClient.get<EnhancedRide[]>('/api/v2/bookings/history/all');
    return response.data;
  },

  // Get nearby drivers count
  getNearbyDrivers: async (): Promise<{ nearby_count: number }> => {
    const response = await apiClient.get<{ nearby_count: number }>('/api/v2/bookings/nearby-drivers');
    return response.data;
  },

  // Get nearby drivers locations for map display (optional category / women filter)
  getNearbyDriversLocations: async (
    lat: number,
    lng: number,
    opts?: { vehicle_category?: string; women_only?: boolean }
  ): Promise<{
    drivers: Array<{
      id: string;
      latitude: number;
      longitude: number;
      vehicle_type: string;
      category?: string;
      gender?: string | null;
    }>;
  }> => {
    const response = await apiClient.get('/api/v2/bookings/nearby-drivers/locations', {
      params: {
        lat,
        lng,
        vehicle_category: opts?.vehicle_category || undefined,
        women_only: opts?.women_only ? true : undefined,
      },
    });
    return response.data;
  },

  // Get active ride tracking (driver location)
  getActiveRideTracking: async (): Promise<{
    ride_id: string;
    status: string;
    driver_lat: number | null;
    driver_lng: number | null;
    heading?: number | null;
    speed?: number | null;
    accuracy?: number | null;
    sequence?: number | null;
    location_updated_at?: string | null;
    pickup_lat: number;
    pickup_lng: number;
    dropoff_lat: number | null;
    dropoff_lng: number | null;
  }> => {
    const response = await apiClient.get('/api/v2/bookings/active/tracking');
    return response.data;
  },

  // Create Razorpay order for a ride
  createPaymentOrder: async (rideId: string): Promise<{
    order_id: string;
    amount: number;
    currency: string;
    key_id: string;
  }> => {
    const response = await apiClient.post(`/api/v2/bookings/${rideId}/payment/create-order`);
    return response.data;
  },

  // Verify Razorpay payment
  verifyPayment: async (rideId: string, data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): Promise<{ message: string; transaction_id: string }> => {
    const response = await apiClient.post(`/api/v2/bookings/${rideId}/payment/verify`, {
      ride_id: rideId,
      ...data,
    });
    return response.data;
  },

  submitRating: async (rideId: string, rating: number, comment?: string) => {
    const response = await apiClient.post(`/api/v2/safety/rides/${rideId}/rating`, {
      rating,
      comment,
    });
    return response.data;
  },

  triggerSOS: async (rideId: string, data?: { latitude?: number; longitude?: number; note?: string }) => {
    const response = await apiClient.post(`/api/v2/safety/rides/${rideId}/sos`, data || {});
    return response.data;
  },

  createTripShare: async (rideId: string) => {
    const response = await apiClient.post<{ share_token: string; share_path: string; ride_id: string }>(
      `/api/v2/safety/rides/${rideId}/trip-share`
    );
    return response.data;
  },
};

export const userEnhancedApi = {
  // Get saved places
  getSavedPlaces: async (): Promise<SavedPlaces> => {
    const response = await apiClient.get<SavedPlaces>('/api/v2/user/saved-places');
    return response.data;
  },

  // Save place
  savePlace: async (placeType: 'home' | 'work', data: SavedPlace) => {
    const response = await apiClient.put(`/api/v2/user/saved-places/${placeType}`, {
      place_type: placeType,
      ...data
    });
    return response.data;
  },

  // Delete place
  deletePlace: async (placeType: 'home' | 'work') => {
    const response = await apiClient.delete(`/api/v2/user/saved-places/${placeType}`);
    return response.data;
  }
};
