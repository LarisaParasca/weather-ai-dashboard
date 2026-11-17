import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJson, readErrorMessage } from './apiClient';

afterEach(() => vi.unstubAllGlobals());

describe('getJson', () => {
  it('returns the body on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ results: [] })));
    await expect(getJson('/api/geocode?q=xx')).resolves.toEqual({ results: [] });
  });

  it("uses the route's own error message", async () => {
    const body = { error: { code: 'UPSTREAM_TIMEOUT', message: 'The weather service did not respond in time. Try again.' } };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(body, { status: 504 })));
    await expect(getJson('/api/weather')).rejects.toThrow('The weather service did not respond in time. Try again.');
  });

  it('falls back to a generic message for a non-JSON error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>', { status: 500 })));
    await expect(getJson('/api/weather')).rejects.toThrow('Request failed (HTTP 500). Try again.');
  });

  it('reports a network failure readably', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(getJson('/api/weather')).rejects.toThrow('Network error. Check your connection and try again.');
  });

  it('re-throws aborts untouched', async () => {
    const controller = new AbortController();
    controller.abort();
    const abortError = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortError));
    await expect(getJson('/api/weather', controller.signal)).rejects.toBe(abortError);
  });
});

describe('readErrorMessage', () => {
  it('reads our error shape and ignores anything else', () => {
    expect(readErrorMessage({ error: { code: 'X', message: 'Hi' } })).toBe('Hi');
    expect(readErrorMessage({ error: 'Hi' })).toBeNull();
    expect(readErrorMessage(null)).toBeNull();
  });
});
