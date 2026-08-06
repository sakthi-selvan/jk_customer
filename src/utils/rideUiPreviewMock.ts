import { EnhancedRide, VehicleCategory } from '../types/enhanced';

/** User's current test location (from device logs). */
export const PREVIEW_PICKUP = {
  latitude: 12.8220309,
  longitude: 77.6780941,
  address: 'Your current location',
};

/** Short trip drop ~1 km north of pickup. */
export const PREVIEW_DROPOFF = {
  latitude: 12.8288812,
  longitude: 77.6814131,
  address: 'Nearby destination',
};

export const PREVIEW_OTP = '1254';

export type PreviewPhase = 'searching' | 'accepted' | 'started' | 'completed';

export const PREVIEW_PHASES: Array<{ id: PreviewPhase; label: string }> = [
  { id: 'searching', label: 'Searching' },
  { id: 'accepted', label: 'Coming to you' },
  { id: 'started', label: 'On trip' },
  { id: 'completed', label: 'Dropped' },
];

export type NearbyPin = {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
};

/** One–two captains per category around pickup for the searching map. */
export function buildNearbyPreviewPins(): NearbyPin[] {
  const { latitude: lat, longitude: lng } = PREVIEW_PICKUP;
  const offsets: Array<[string, number, number]> = [
    [VehicleCategory.BIKE, 0.0018, 0.0012],
    [VehicleCategory.AUTO, -0.0015, 0.0016],
    [VehicleCategory.MINI, 0.0022, -0.0010],
    [VehicleCategory.SEDAN, -0.0020, -0.0014],
    [VehicleCategory.SUV, 0.0008, -0.0022],
    // second pin for a couple categories
    [VehicleCategory.BIKE, -0.0009, 0.0024],
    [VehicleCategory.MINI, 0.0012, 0.0020],
  ];
  return offsets.map(([category, dLat, dLng], i) => ({
    id: `preview-${category}-${i}`,
    category,
    latitude: lat + dLat,
    longitude: lng + dLng,
  }));
}

/** Driver starts ~1.2 km SW of pickup, then moves to pickup, then to drop. */
export const DRIVER_START = {
  latitude: PREVIEW_PICKUP.latitude - 0.008,
  longitude: PREVIEW_PICKUP.longitude - 0.006,
};

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function interpolateLocation(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  t: number
) {
  const clamped = Math.max(0, Math.min(1, t));
  return {
    latitude: lerp(from.latitude, to.latitude, clamped),
    longitude: lerp(from.longitude, to.longitude, clamped),
  };
}

export function buildPreviewRide(phase: PreviewPhase): EnhancedRide {
  const now = new Date().toISOString();
  const assigned = phase !== 'searching';
  const status =
    phase === 'searching'
      ? 'pending'
      : phase === 'accepted'
        ? 'accepted'
        : phase === 'started'
          ? 'started'
          : 'completed';

  return {
    id: 'preview-ride-ui',
    user_id: 'preview-user',
    driver_id: assigned ? 'preview-driver' : undefined,
    trip_type: 'one_way',
    vehicle_category: VehicleCategory.MINI,
    pickup_location: PREVIEW_PICKUP.address,
    dropoff_location: PREVIEW_DROPOFF.address,
    pickup_lat: PREVIEW_PICKUP.latitude,
    pickup_lng: PREVIEW_PICKUP.longitude,
    dropoff_lat: PREVIEW_DROPOFF.latitude,
    dropoff_lng: PREVIEW_DROPOFF.longitude,
    stops: [],
    is_scheduled: false,
    booking_for_self: true,
    preferences: {
      ac_preferred: false,
      pet_friendly: false,
      silent_ride: false,
      extra_luggage: false,
      wheelchair_support: false,
      women_driver: false,
    },
    ride_otp: PREVIEW_OTP,
    otp_verified: phase === 'started' || phase === 'completed',
    status,
    fare: 186,
    base_fare: 80,
    distance_fare: 70,
    platform_fee: 10,
    gst: 16,
    toll_charges: 0,
    night_charges: 0,
    waiting_charges: 0,
    payment_status: 'pending',
    payment_method: 'cash',
    distance_km: 1.4,
    eta_minutes: phase === 'accepted' ? 6 : phase === 'started' ? 8 : 5,
    driver_name: assigned ? 'Karthik R' : undefined,
    driver_phone: assigned ? '9876543210' : undefined,
    driver_vehicle_number: assigned ? 'TN 39 AB 4521' : undefined,
    driver_vehicle_type: assigned ? 'Mini · WagonR' : undefined,
    rejection_count: phase === 'searching' ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
}
