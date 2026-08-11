// Mapbox Configuration for JK Taxi
// Preview APKs may ship without EXPO_PUBLIC_*; after login we load a pk. token from the backend.

let runtimeAccessToken = '';

const envToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

/** Prefer runtime (from API) then build-time env. */
export function getMapboxAccessToken(): string {
  return runtimeAccessToken || envToken || '';
}

/** Apply token from backend after authentication. */
export function setRuntimeMapboxToken(token: string | null | undefined): void {
  const next = (token || '').trim();
  if (next.length > 10) {
    runtimeAccessToken = next;
  }
}

export function clearRuntimeMapboxToken(): void {
  runtimeAccessToken = '';
}

/** @deprecated Prefer getMapboxAccessToken() — kept for older imports (env-only snapshot). */
export const MAPBOX_ACCESS_TOKEN = envToken;

// Default map center (Bangalore, India)
export const DEFAULT_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

// Map style URLs
export const MAP_STYLES = {
  STREETS: 'mapbox://styles/mapbox/streets-v12',
  DARK: 'mapbox://styles/mapbox/dark-v11',
  LIGHT: 'mapbox://styles/mapbox/light-v11',
  NAVIGATION_DAY: 'mapbox://styles/mapbox/navigation-day-v1',
  NAVIGATION_NIGHT: 'mapbox://styles/mapbox/navigation-night-v1',
  SATELLITE: 'mapbox://styles/mapbox/satellite-streets-v12',
};

// Zoom levels
export const ZOOM_LEVELS = {
  DEFAULT: 14,
  PICKUP: 16,
  ROUTE: 12,
  CITY: 11,
  MARKER: 15,
};

// Animation duration (ms)
export const ANIMATION_DURATION = 1000;

// Map padding for route fitting
export const MAP_PADDING = {
  top: 100,
  right: 50,
  bottom: 300,
  left: 50,
};
