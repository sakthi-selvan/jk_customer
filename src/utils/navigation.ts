import { router } from 'expo-router';

/** Normalize expo-router pathnames for comparison. */
export function normalizePath(path?: string | null): string {
  if (!path || path === '') return '/';
  const trimmed = path.replace(/\/+$/, '');
  if (trimmed === '' || trimmed === '/index') return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function isCurrentRoute(pathname: string | null | undefined, href: string): boolean {
  return normalizePath(pathname) === normalizePath(href);
}

/**
 * Navigate only when the target differs from the current screen.
 * Prevents remount/refresh when tapping Home (or any tab) you're already on.
 */
export function navigateIfNeeded(
  pathname: string | null | undefined,
  href: string,
  mode: 'push' | 'replace' = 'push'
): boolean {
  if (isCurrentRoute(pathname, href)) return false;
  if (mode === 'replace') {
    router.replace(href as any);
  } else {
    router.push(href as any);
  }
  return true;
}
