import Mapbox from '@rnmapbox/maps';
import {
  getMapboxAccessToken,
  setRuntimeMapboxToken,
  clearRuntimeMapboxToken,
} from './mapbox-config';

let initialized = false;
let tokenApplied = false;

function isUsableToken(token: string | null | undefined): token is string {
  return Boolean(token && token.length > 10 && !token.startsWith('@'));
}

/**
 * Safe boot init. NEVER call setTelemetryEnabled (or other Map APIs) before a token —
 * Android crashes with MapboxConfigurationException (native, not caught by try/catch).
 */
export function initMapbox(): { ok: boolean; reason?: string } {
  const token = getMapboxAccessToken();
  if (!isUsableToken(token)) {
    return { ok: false, reason: 'missing_token' };
  }
  return applyTokenSync(token);
}

function applyTokenSync(token: string): { ok: boolean; reason?: string } {
  try {
    // setAccessToken must run BEFORE any other Mapbox native call
    void Mapbox.setAccessToken(token);
    tokenApplied = true;
    initialized = true;
    // Telemetry touches Map internals and requires a token already set
    try {
      Mapbox.setTelemetryEnabled?.(false);
    } catch {
      // ignore — never crash the app for telemetry
    }
    return { ok: true };
  } catch (e) {
    console.warn('[Mapbox] setAccessToken failed', e);
    return { ok: false, reason: 'init_failed' };
  }
}

/** Apply a token from the backend and push it into the native Mapbox SDK. */
export async function applyMapboxAccessToken(token: string): Promise<boolean> {
  if (!isUsableToken(token)) return false;
  setRuntimeMapboxToken(token);
  const next = getMapboxAccessToken();
  if (!isUsableToken(next)) return false;

  try {
    await Mapbox.setAccessToken(next);
    tokenApplied = true;
    initialized = true;
    try {
      Mapbox.setTelemetryEnabled?.(false);
    } catch {
      // ignore
    }
    return true;
  } catch (e) {
    console.warn('[Mapbox] apply token failed', e);
    return false;
  }
}

export function resetMapboxRuntimeToken(): void {
  clearRuntimeMapboxToken();
  tokenApplied = false;
  const env = getMapboxAccessToken();
  if (isUsableToken(env)) {
    applyTokenSync(env);
  }
}

/**
 * Android: false = TextureView (fixes blank/black maps on many OEMs + React Navigation).
 * iOS ignores this prop.
 */
export const MAP_SURFACE_VIEW = false;

export function mapboxTokenPresent(): boolean {
  return isUsableToken(getMapboxAccessToken());
}

/** True when a token string exists (may not yet be applied to native). */
export function mapboxTokenConfigured(): boolean {
  return isUsableToken(getMapboxAccessToken());
}
