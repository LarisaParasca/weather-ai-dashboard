import { isFiniteNumber, isRecord } from './http';
import type { Coordinates } from './types';

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

/**
 * Body of POST /api/image: `{ locations: [{ latitude, longitude }, ...] }`, exactly
 * `count` entries in slot order. Returns only the coordinates, or null if invalid.
 */
export function parseImageRequest(body: unknown, count: number): Coordinates[] | null {
  if (!isRecord(body) || !Array.isArray(body.locations) || body.locations.length !== count) return null;
  const coords: Coordinates[] = [];
  for (const item of body.locations) {
    if (
      !isRecord(item) ||
      !isFiniteNumber(item.latitude) ||
      !isFiniteNumber(item.longitude) ||
      Math.abs(item.latitude) > 90 ||
      Math.abs(item.longitude) > 180
    ) {
      return null;
    }
    coords.push({ latitude: item.latitude, longitude: item.longitude });
  }
  return coords;
}
