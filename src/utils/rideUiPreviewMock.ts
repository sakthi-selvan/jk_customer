import { EnhancedRide, VehicleCategory } from '../types/enhanced';
import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox-config';

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

export type LngLat = [number, number]; // [lng, lat]

/** One–two captains per category around pickup for the searching map. */
export function buildNearbyPreviewPins(): NearbyPin[] {
  const { latitude: lat, longitude: lng } = PREVIEW_PICKUP;
  const offsets: Array<[string, number, number]> = [
    [VehicleCategory.BIKE, 0.0018, 0.0012],
    [VehicleCategory.AUTO, -0.0015, 0.0016],
    [VehicleCategory.MINI, 0.0022, -0.0010],
    [VehicleCategory.SEDAN, -0.0020, -0.0014],
    [VehicleCategory.SUV, 0.0008, -0.0022],
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

/** Driver starts ~1.2 km SW of pickup. */
export const DRIVER_START = {
  latitude: PREVIEW_PICKUP.latitude - 0.008,
  longitude: PREVIEW_PICKUP.longitude - 0.006,
};

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function haversineMeters(a: LngLat, b: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Fetch a driving polyline between two points (Mapbox). Falls back to a straight segment. */
export async function fetchDrivingRoute(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number }
): Promise<LngLat[]> {
  const fallback: LngLat[] = [
    [from.longitude, from.latitude],
    [to.longitude, to.latitude],
  ];
  if (!MAPBOX_ACCESS_TOKEN) return fallback;

  try {
    const url =
      `https://api.mapbox.com/directions/v5/mapbox/driving/` +
      `${from.longitude},${from.latitude};${to.longitude},${to.latitude}` +
      `?geometries=geojson&overview=full&access_token=${MAPBOX_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    const coords = data?.routes?.[0]?.geometry?.coordinates as LngLat[] | undefined;
    if (coords && coords.length >= 2) return coords;
  } catch {
    // ignore
  }
  return fallback;
}

function bearingDegrees(a: LngLat, b: LngLat) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const dLng = toRad(b[0] - a[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Place a point at fraction t (0..1) along a route, with heading following the road.
 */
export function pointAlongRoute(coords: LngLat[], t: number) {
  const clamped = Math.max(0, Math.min(1, t));
  if (!coords.length) {
    return { latitude: PREVIEW_PICKUP.latitude, longitude: PREVIEW_PICKUP.longitude, heading: 0 };
  }
  if (coords.length === 1 || clamped <= 0) {
    const [lng, lat] = coords[0];
    const heading = coords.length > 1 ? bearingDegrees(coords[0], coords[1]) : 0;
    return { latitude: lat, longitude: lng, heading };
  }
  if (clamped >= 1) {
    const last = coords[coords.length - 1];
    const prev = coords[coords.length - 2] || last;
    return {
      latitude: last[1],
      longitude: last[0],
      heading: bearingDegrees(prev, last),
    };
  }

  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const len = haversineMeters(coords[i], coords[i + 1]);
    segLens.push(len);
    total += len;
  }
  if (total <= 0) {
    const [lng, lat] = coords[0];
    return { latitude: lat, longitude: lng, heading: 0 };
  }

  let remain = total * clamped;
  for (let i = 0; i < segLens.length; i++) {
    const len = segLens[i];
    if (remain <= len || i === segLens.length - 1) {
      const localT = len > 0 ? remain / len : 1;
      const a = coords[i];
      const b = coords[i + 1];
      return {
        longitude: lerp(a[0], b[0], localT),
        latitude: lerp(a[1], b[1], localT),
        heading: bearingDegrees(a, b),
      };
    }
    remain -= len;
  }

  const last = coords[coords.length - 1];
  return { latitude: last[1], longitude: last[0], heading: 0 };
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
    driver_vehicle_type: assigned ? 'Mini' : undefined,
    driver_vehicle_image: assigned
      ? 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400&q=80'
      : undefined,
    rejection_count: phase === 'searching' ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
}
