import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppError, errorResponse, fetchJson } from './http';

const options = { service: 'weather service', timeoutMs: 1000 };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('fetchJson', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ ok: 1 })));
    await expect(fetchJson('https://x', options)).resolves.toEqual({ ok: 1 });
  });

  it('turns a timeout into a 504 that names the service', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')));
    await expect(fetchJson('https://x', options)).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
      status: 504,
      message: 'The weather service did not respond in time. Try again.',
    });
  });

  it('turns a network failure into a 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(fetchJson('https://x', options)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR', status: 502 });
  });

  it('turns a non-2xx upstream status into a 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('down', { status: 503 })));
    await expect(fetchJson('https://x', options)).rejects.toMatchObject({
      code: 'UPSTREAM_ERROR',
      message: 'The weather service returned an error (HTTP 503).',
    });
  });

  it('turns invalid JSON into a 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>')));
    await expect(fetchJson('https://x', options)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });
});

describe('errorResponse', () => {
  it('uses the AppError status and message', async () => {
    const res = errorResponse(new AppError('BAD_REQUEST', 'Nope.', 400));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: { code: 'BAD_REQUEST', message: 'Nope.' } });
  });

  it('hides unexpected errors behind a generic 500', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = errorResponse(new Error('secret stack detail'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: { code: 'INTERNAL', message: 'Something went wrong on our side.' } });
  });
});
