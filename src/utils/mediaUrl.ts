import { API_CONFIG } from '../config';

/** Resolve /uploads/... paths to absolute URLs for Image components. */
export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:')) return path;
  const origin = String(API_CONFIG.BASE_URL || '').replace(/\/api\/?$/, '');
  return path.startsWith('/') ? `${origin}${path}` : `${origin}/${path}`;
}
