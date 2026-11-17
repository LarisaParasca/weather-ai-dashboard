import type { ApiErrorBody, ErrorCode } from './types';

/** An error that is safe to show to the user, with the HTTP status to send. */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * fetch() with a hard timeout. Network failures and timeouts become AppErrors
 * that name the service, so routes never leak raw fetch errors to the user.
 * Non-2xx responses are returned as-is: callers decide what a status means.
 */
export async function fetchWithTimeout(
  url: string,
  { service, timeoutMs, init }: { service: string; timeoutMs: number; init?: RequestInit },
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new AppError('UPSTREAM_TIMEOUT', `The ${service} did not respond in time. Try again.`, 504);
    }
    throw new AppError('UPSTREAM_ERROR', `Could not reach the ${service}. Try again.`, 502);
  }
}

/** fetchWithTimeout + "must be 2xx" + parse JSON. */
export async function fetchJson(
  url: string,
  options: { service: string; timeoutMs: number; init?: RequestInit },
): Promise<unknown> {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) {
    throw new AppError('UPSTREAM_ERROR', `The ${options.service} returned an error (HTTP ${res.status}).`, 502);
  }
  try {
    return await res.json();
  } catch {
    throw new AppError('UPSTREAM_ERROR', `Unexpected response from the ${options.service}.`, 502);
  }
}

/** Turns any thrown value into our standard JSON error response. */
export function errorResponse(err: unknown): Response {
  if (err instanceof AppError) {
    const body: ApiErrorBody = { error: { code: err.code, message: err.message } };
    return Response.json(body, { status: err.status });
  }
  console.error(err);
  const body: ApiErrorBody = { error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } };
  return Response.json(body, { status: 500 });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
