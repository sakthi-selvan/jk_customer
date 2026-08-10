// Enhanced booking types for V2 API

export enum TripType {
  ONE_WAY = "one_way",
  ROUND_TRIP = "round_trip",
  RENTAL = "rental",
  OUTSTATION = "outstation",
  AIRPORT_PICKUP = "airport_pickup",
  AIRPORT_DROP = "airport_drop"
}

export enum VehicleCategory {
  BIKE = "bike",
  AUTO = "auto",
  MINI = "mini",
  SEDAN = "sedan",
  SUV = "suv",
}

export interface VehicleCategoryData {
  id: string;
  name: string;
  display_name: string;
  description: string;
  seater_capacity: number;
  base_fare: number;
  per_km_rate: number;
  hourly_rate?: number;
  platform_fee?: number;
  night_surcharge_percent?: number;
  gst_percent?: number;
  waiting_charge_per_min?: number;
  example_vehicles: string[];
  features: string[];
  icon_name: string;
  is_active: boolean;
  display_order: number;
}

export interface StopLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export interface RidePreferences {
  ac_preferred: boolean;
  pet_friendly: boolean;
  silent_ride: boolean;
  extra_luggage: boolean;
  wheelchair_support: boolean;
  women_driver: boolean;
}

export interface FareBreakdown {
  base_fare: number;
  distance_fare: number;
  distance_km?: number;
  duration_minutes?: number;
  route_source?: string;
  platform_fee: number;
  gst: number;
  toll_charges: number;
  night_charges: number;
  waiting_charges: number;
  total: number;
}

export interface EnhancedRide {
  id: string;
  user_id: string;
  driver_id?: string;
  trip_type: string;
  vehicle_category: string;
  pickup_location: string;
  dropoff_location?: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  stops: StopLocation[];
  is_scheduled: boolean;
  scheduled_datetime?: string;
  booking_for_self: boolean;
  passenger_name?: string;
  passenger_phone?: string;
  passenger_notes?: string;
  preferences: RidePreferences;
  driver_notes?: string;
  ride_otp: string;
  otp_verified: boolean;
  status: string;
  fare: number;
  base_fare: number;
  distance_fare: number;
  platform_fee: number;
  gst: number;
  toll_charges: number;
  night_charges: number;
  waiting_charges: number;
  payment_status: string;
  payment_method: string;
  transaction_id?: string;
  distance_km: number;
  eta_minutes: number;
  driver_name?: string;
  driver_phone?: string;
  driver_vehicle_number?: string;
  driver_vehicle_type?: string;
  driver_vehicle_image?: string;
  rejection_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SavedPlace {
  address: string;
  latitude: number;
  longitude: number;
}

export interface SavedPlaces {
  home?: SavedPlace;
  work?: SavedPlace;
}

export interface BookingCreateRequest {
  trip_type: TripType;
  vehicle_category: VehicleCategory;
  pickup_location: string;
  dropoff_location?: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  stops?: StopLocation[];
  is_scheduled?: boolean;
  scheduled_datetime?: string;
  booking_for_self?: boolean;
  passenger_name?: string;
  passenger_phone?: string;
  passenger_notes?: string;
  preferences?: RidePreferences;
  driver_notes?: string;
  payment_method?: string;
  rental_hours?: number;
}
