// User types
export interface User {
  id: string;
  phone: string;
  name: string;
  email?: string;
  age?: number;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  ride_otp: string; // Static OTP for all rides (like Rapido)
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
}

// Auth types
export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Ride/Booking types
export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  STARTED = 'started',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Ride {
  id: string;
  user_id: string;
  driver_id?: string;
  pickup_location: string;
  dropoff_location: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  status: RideStatus;
  fare: number;
  payment_status: PaymentStatus;
  payment_method: string;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRideData {
  pickup_location: string;
  dropoff_location: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  payment_method?: string;
}

export interface PaymentData {
  ride_id: string;
  amount: number;
  payment_method: string;
}
