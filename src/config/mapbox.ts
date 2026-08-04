// Mapbox Configuration
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Default map center (Bangalore)
export const DEFAULT_CENTER = {
  latitude: 12.9716,
  longitude: 77.5946,
};

// Map style URLs
export const MAPBOX_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';
export const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11';
export const MAPBOX_STYLE_LIGHT = 'mapbox://styles/mapbox/light-v11';
export const MAPBOX_STYLE_NAVIGATION = 'mapbox://styles/mapbox/navigation-day-v1';
export const MAPBOX_STYLE_NAVIGATION_NIGHT = 'mapbox://styles/mapbox/navigation-night-v1';

// Zoom levels
export const DEFAULT_ZOOM = 14;
export const PICKUP_ZOOM = 16;
export const ROUTE_ZOOM = 13;
