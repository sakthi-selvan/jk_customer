/**
 * FastAPI often returns `detail` as a string OR a validation array.
 * Android Alert.alert crashes if `message` is not a string.
 */
export function formatApiDetail(detail: unknown, fallback = 'Something went wrong'): string {
  if (detail == null || detail === '') return fallback;
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'number' || typeof detail === 'boolean') return String(detail);

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const msg = (item as { msg?: unknown; message?: unknown }).msg
            ?? (item as { message?: unknown }).message;
          const loc = Array.isArray((item as { loc?: unknown }).loc)
            ? (item as { loc: unknown[] }).loc.filter((x) => x !== 'body').join('.')
            : '';
          if (typeof msg === 'string' && loc) return `${loc}: ${msg}`;
          if (typeof msg === 'string') return msg;
        }
        try {
          return JSON.stringify(item);
        } catch {
          return String(item);
        }
      })
      .filter(Boolean);
    return parts.length ? parts.join('\n') : fallback;
  }

  if (typeof detail === 'object') {
    const obj = detail as { msg?: unknown; message?: unknown; detail?: unknown };
    if (typeof obj.msg === 'string') return obj.msg;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.detail === 'string') return obj.detail;
    try {
      return JSON.stringify(detail);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export function formatApiError(error: unknown, fallback = 'Something went wrong'): string {
  const anyErr = error as { response?: { data?: { detail?: unknown } }; message?: unknown };
  return formatApiDetail(anyErr?.response?.data?.detail ?? anyErr?.message, fallback);
}
