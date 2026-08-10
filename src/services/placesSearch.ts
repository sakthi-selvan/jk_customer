import { MAPBOX_ACCESS_TOKEN } from '../config/mapbox-config';
import { geoApi, type PlaceResult } from '../api/geo';

export type { PlaceResult };

/**
 * Place autocomplete that works in preview APKs even when
 * EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN was not baked into the JS bundle.
 * Prefers backend (/api/v2/geo) then falls back to direct Mapbox.
 */
export async function searchPlaces(
  query: string,
  opts?: { proximity?: { latitude: number; longitude: number }; limit?: number }
): Promise<{ results: PlaceResult[]; source: 'backend' | 'mapbox' | 'none'; error?: string }> {
  const q = query.trim();
  if (q.length < 2) {
    return { results: [], source: 'none' };
  }

  try {
    const results = await geoApi.search(q, opts);
    if (results.length > 0) {
      return { results, source: 'backend' };
    }
  } catch (e) {
    // fall through — common when offline or older backend without /geo
  }

  if (!MAPBOX_ACCESS_TOKEN) {
    return {
      results: [],
      source: 'none',
      error: 'Map search is not configured in this build. Update the app or check your connection.',
    };
  }

  try {
    let url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
      `?access_token=${MAPBOX_ACCESS_TOKEN}&limit=${opts?.limit ?? 5}` +
      `&country=IN&types=place,locality,neighborhood,address,poi,district,region&language=en`;
    if (opts?.proximity) {
      url += `&proximity=${opts.proximity.longitude},${opts.proximity.latitude}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    if (data.message) {
      return { results: [], source: 'none', error: String(data.message) };
    }
    const features = data.features || [];
    const results: PlaceResult[] = features.map((feature: any) => ({
      name: feature.text,
      address: feature.place_name,
      latitude: feature.center[1],
      longitude: feature.center[0],
    }));
    return { results, source: results.length ? 'mapbox' : 'none' };
  } catch (e) {
    return {
      results: [],
      source: 'none',
      error: e instanceof Error ? e.message : 'Search failed',
    };
  }
}
