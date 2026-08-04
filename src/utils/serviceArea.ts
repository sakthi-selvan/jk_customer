/**
 * Service area helpers (keep in sync with backend SERVICE_AREA_BBOX).
 * Default covers Tamil Nadu-ish bounds used by the API.
 */

export const SERVICE_AREA = {
  enabled: true,
  // minLng, minLat, maxLng, maxLat
  bbox: [76.0, 8.0, 80.5, 13.6] as [number, number, number, number],
};

export function isInServiceArea(latitude: number, longitude: number): boolean {
  if (!SERVICE_AREA.enabled) return true;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
  const [minLng, minLat, maxLng, maxLat] = SERVICE_AREA.bbox;
  return latitude >= minLat && latitude <= maxLat && longitude >= minLng && longitude <= maxLng;
}

export function serviceAreaError(latitude: number, longitude: number, label = 'Location'): string | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return `${label} coordinates are invalid`;
  }
  if (!isInServiceArea(latitude, longitude)) {
    return `${label} is outside our service area`;
  }
  return null;
}
