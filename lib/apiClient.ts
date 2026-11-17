import { isRecord } from './http';

/** A failed call to our API. `message` is safe to show; `body` is the parsed error body, if any. */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

/**
 * Browser-side fetch for our own API routes. Turns any failure into an
 * ApiRequestError with a message that is safe to show: the route's own error
 * message, or a generic one. Aborts are re-thrown untouched so callers can ignore them.
 */
export async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    if (init.signal?.aborted) throw err;
    throw new ApiRequestError('Network error. Check your connection and try again.');
  }

  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiRequestError(readErrorMessage(body) ?? `Request failed (HTTP ${res.status}). Try again.`, body);
  }
  if (body === null) throw new ApiRequestError('Unexpected response from the server. Try again.');
  return body as T;
}

export function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(url, { signal });
}

export function postJson<T>(url: string, data: unknown, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
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
