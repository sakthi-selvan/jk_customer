import Mapbox from '@rnmapbox/maps';
import {
  getMapboxAccessToken,
  setRuntimeMapboxToken,
  clearRuntimeMapboxToken,
} from './mapbox-config';

let initialized = false;

/**
 * Call once at app boot. Empty token → black MapView until ensureMapboxTokenAfterAuth runs.
 * Android: prefer TextureView (surfaceView=false) to avoid OEM black-screen bugs.
 */
export function initMapbox(): { ok: boolean; reason?: string } {
  const token = getMapboxAccessToken();
  if (!initialized) {
    initialized = true;
    try {
      Mapbox.setTelemetryEnabled?.(false);
    } catch {
      // ignore
    }
  }

  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  try {
    Mapbox.setAccessToken(token);
  } catch (e) {
    console.warn('[Mapbox] setAccessToken failed', e);
    return { ok: false, reason: 'init_failed' };
  }

  return { ok: true };
}

/** Apply a token from the backend and push it into the native Mapbox SDK. */
export function applyMapboxAccessToken(token: string): boolean {
  setRuntimeMapboxToken(token);
  try {
    Mapbox.setAccessToken(getMapboxAccessToken());
    initialized = true;
    return true;
  } catch (e) {
    console.warn('[Mapbox] apply token failed', e);
    return false;
  }
}

export function resetMapboxRuntimeToken(): void {
  clearRuntimeMapboxToken();
  const env = getMapboxAccessToken();
  if (env) {
    try {
      Mapbox.setAccessToken(env);
    } catch {
      // ignore
    }
  }
}

/**
 * Android: false = TextureView (fixes blank/black maps on many OEMs + React Navigation).
 * iOS ignores this prop.
 */
export const MAP_SURFACE_VIEW = false;

export function mapboxTokenPresent(): boolean {
  const t = getMapboxAccessToken();
  return Boolean(t && t.length > 10);
}
