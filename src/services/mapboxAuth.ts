import { geoApi } from '../api/geo';
import {
  applyMapboxAccessToken,
  initMapbox,
  mapboxTokenPresent,
  mapboxTokenConfigured,
} from '../config/initMapbox';
import storage from '../utils/storage';

const CACHE_KEY = 'mapbox_public_token';

/**
 * After login / session restore: load Mapbox pk. token from backend so preview
 * builds (without EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN) still get full map tiles.
 * Always await setAccessToken before any MapView mounts.
 */
export async function ensureMapboxTokenAfterAuth(): Promise<boolean> {
  // Build-time env token (dev)
  if (mapboxTokenConfigured()) {
    initMapbox();
  }

  try {
    const cached = await storage.getItem(CACHE_KEY);
    if (cached && cached.startsWith('pk.')) {
      await applyMapboxAccessToken(cached);
    }
  } catch {
    // ignore
  }

  try {
    const { access_token } = await geoApi.getMapboxToken();
    if (access_token?.startsWith('pk.')) {
      const ok = await applyMapboxAccessToken(access_token);
      if (ok) {
        try {
          await storage.setItem(CACHE_KEY, access_token);
        } catch {
          // ignore
        }
        return true;
      }
    }
  } catch (e) {
    console.warn('[Mapbox] failed to load token from backend', e);
  }

  return mapboxTokenPresent();
}

export async function clearCachedMapboxToken(): Promise<void> {
  try {
    await storage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}
