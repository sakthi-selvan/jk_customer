import Mapbox from '@rnmapbox/maps';
import { MAPBOX_ACCESS_TOKEN } from './mapbox-config';

let initialized = false;

/**
 * Call once at app boot. Empty token → black MapView on devices.
 * Android: prefer TextureView (surfaceView=false) to avoid OEM black-screen bugs.
 */
export function initMapbox(): { ok: boolean; reason?: string } {
  if (initialized) {
    return { ok: Boolean(MAPBOX_ACCESS_TOKEN) };
  }
  initialized = true;

  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn(
      '[Mapbox] EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN is missing. Maps will render blank.'
    );
    return { ok: false, reason: 'missing_token' };
  }

  try {
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    // Telemetry can hang style load on some networks / OEMs
    Mapbox.setTelemetryEnabled?.(false);
  } catch (e) {
    console.warn('[Mapbox] setAccessToken failed', e);
    return { ok: false, reason: 'init_failed' };
  }

  return { ok: true };
}

/**
 * Android: false = TextureView (fixes blank/black maps on many OEMs + React Navigation).
 * iOS ignores this prop.
 */
export const MAP_SURFACE_VIEW = false;

export function mapboxTokenPresent(): boolean {
  return Boolean(MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN.length > 10);
}
