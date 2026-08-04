/**
 * Split a route polyline into travelled (behind) vs remaining (ahead)
 * for Google Maps–style navigation progress.
 */

export type LngLat = [number, number]; // [lng, lat]

export interface RouteProgressSplit {
  travelled: LngLat[];
  remaining: LngLat[];
  snapped: LngLat;
  distanceToRouteMeters: number;
  offRoute: boolean;
  /** 0..1 along the original route */
  fraction: number;
}

const EARTH_RADIUS_M = 6371000;
const DEFAULT_OFF_ROUTE_M = 60;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function haversineMeters(a: LngLat, b: LngLat): number {
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

function projectOnSegment(
  p: LngLat,
  a: LngLat,
  b: LngLat
): { point: LngLat; t: number; dist: number } {
  const lat0 = toRad((a[1] + b[1]) / 2);
  const ax = toRad(a[0]) * Math.cos(lat0);
  const ay = toRad(a[1]);
  const bx = toRad(b[0]) * Math.cos(lat0);
  const by = toRad(b[1]);
  const px = toRad(p[0]) * Math.cos(lat0);
  const py = toRad(p[1]);

  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = 0;
  if (len2 > 0) {
    t = ((px - ax) * dx + (py - ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
  }

  const qx = ax + t * dx;
  const qy = ay + t * dy;
  const point: LngLat = [(qx / Math.cos(lat0)) * (180 / Math.PI), qy * (180 / Math.PI)];
  return { point, t, dist: haversineMeters(p, point) };
}

function lineLengthMeters(coords: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += haversineMeters(coords[i - 1], coords[i]);
  }
  return total;
}

/**
 * Project current GPS onto the route and split into travelled / remaining.
 */
export function splitRouteProgress(
  route: LngLat[],
  current: { latitude: number; longitude: number },
  offRouteMeters: number = DEFAULT_OFF_ROUTE_M
): RouteProgressSplit | null {
  if (!route || route.length < 2) return null;

  const p: LngLat = [current.longitude, current.latitude];
  let bestDist = Infinity;
  let bestSeg = 0;
  let bestPoint: LngLat = route[0];
  let travelledBefore = 0;
  let totalLength = 0;

  const segLengths: number[] = [];
  for (let i = 0; i < route.length - 1; i++) {
    const len = haversineMeters(route[i], route[i + 1]);
    segLengths.push(len);
    totalLength += len;
  }

  let prefix = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const { point, t, dist } = projectOnSegment(p, route[i], route[i + 1]);
    if (dist < bestDist) {
      bestDist = dist;
      bestSeg = i;
      bestPoint = point;
      travelledBefore = prefix + segLengths[i] * t;
    }
    prefix += segLengths[i];
  }

  const travelled: LngLat[] = route.slice(0, bestSeg + 1);
  travelled.push(bestPoint);

  const remaining: LngLat[] = [bestPoint, ...route.slice(bestSeg + 1)];

  const clean = (coords: LngLat[]) => {
    const out: LngLat[] = [];
    for (const c of coords) {
      if (!out.length || haversineMeters(out[out.length - 1], c) > 0.5) {
        out.push(c);
      }
    }
    return out;
  };

  return {
    travelled: clean(travelled),
    remaining: clean(remaining),
    snapped: bestPoint,
    distanceToRouteMeters: bestDist,
    offRoute: bestDist > offRouteMeters,
    fraction: totalLength > 0 ? Math.min(1, travelledBefore / totalLength) : 0,
  };
}

export function remainingDistanceMeters(remaining: LngLat[]): number {
  return lineLengthMeters(remaining);
}

export function estimateRemainingMinutes(
  originalDurationMin: number,
  fraction: number
): number {
  return Math.max(0, originalDurationMin * (1 - fraction));
}
