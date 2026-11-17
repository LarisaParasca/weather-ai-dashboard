import { isRecord } from './http';

/**
 * Browser-side fetch for our own API routes. Turns any failure into an Error
 * whose message is safe to show: the route's own error message, or a generic
 * one. Aborts are re-thrown untouched so callers can ignore them.
 */
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new Error('Network error. Check your connection and try again.');
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(readErrorMessage(body) ?? `Request failed (HTTP ${res.status}). Try again.`);
  }
  if (body === null) throw new Error('Unexpected response from the server. Try again.');
  return body as T;
}

/** Pulls `error.message` out of our standard error body, if it is there. */
export function readErrorMessage(body: unknown): string | null {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === 'string') {
    return body.error.message;
  }
  return null;
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Try again.';
}
