export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 100;

/** Trimmed search text, or null if it is too short or too long. */
export function parseQuery(raw: string | null): string | null {
  const q = (raw ?? '').trim();
  return q.length >= MIN_QUERY_LENGTH && q.length <= MAX_QUERY_LENGTH ? q : null;
}

/**
 * A latitude (limit 90) or longitude (limit 180) from a query string, or null.
 * Guards against Number('') and Number(null), which are both 0.
 */
export function parseCoordinate(raw: string | null, limit: 90 | 180): number | null {
  if (raw === null || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && Math.abs(value) <= limit ? value : null;
}
