import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from './route';

/** Minimal valid Open-Meteo forecast. */
const forecast = {
  timezone: 'Europe/Bucharest',
  current_units: { temperature_2m: '°C', wind_speed_10m: 'km/h' },
  current: { time: '2026-11-17T12:00', temperature_2m: 10, weather_code: 3, wind_speed_10m: 12, is_day: 1 },
  daily: { temperature_2m_max: [12], temperature_2m_min: [4], sunrise: ['2026-11-17T07:10'], sunset: ['2026-11-17T16:45'] },
};

const locations = [
  { latitude: 45.75, longitude: 21.23 },
  { latitude: 35.68, longitude: 139.69 },
  { latitude: 64.14, longitude: -21.9 },
  { latitude: -33.92, longitude: 18.42 },
];

function post(body: unknown) {
  return POST(new Request('http://localhost/api/image', { method: 'POST', body: JSON.stringify(body) }));
}

/** Fake fetch: Open-Meteo answers unless `failLatitude` matches; OpenAI returns `openAI`. */
function stubFetch({ failLatitude, openAI }: { failLatitude?: number; openAI?: Response } = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.startsWith('https://api.open-meteo.com')) {
      return new URL(url).searchParams.get('latitude') === String(failLatitude)
        ? new Response('down', { status: 503 })
        : Response.json(forecast);
    }
    return openAI ?? Response.json({ data: [{ b64_json: 'aW1n' }] });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.stubEnv('OPENAI_API_KEY', 'sk-test');
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('POST /api/image', () => {
  it('fetches weather on the server and returns the prompt and image', async () => {
    const fetchMock = stubFetch();
    const res = await post({ locations });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.image).toBe('aW1n');
    expect(body.prompt).toContain('Top-left panel: Overcast, mild (10°C; today 4°C to 12°C)');
    expect(fetchMock).toHaveBeenCalledTimes(5); // 4 forecasts + 1 image
  });

  it('rejects a body without exactly 4 valid locations', async () => {
    stubFetch();
    const res = await post({ locations: locations.slice(0, 3) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('BAD_REQUEST');
  });

  it('explains a missing API key without calling any API', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const fetchMock = stubFetch();
    const res = await post({ locations });
    expect(res.status).toBe(500);
    expect((await res.json()).error).toEqual({
      code: 'NOT_CONFIGURED',
      message: 'Image generation is not set up: add OPENAI_API_KEY to .env and restart the server.',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('names the slot whose weather failed and does not call OpenAI', async () => {
    const fetchMock = stubFetch({ failLatitude: 64.14 });
    const res = await post({ locations });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe('UPSTREAM_ERROR');
    expect(body.error.message).toMatch(/^Couldn't get the weather for the bottom-left location/);
    expect(fetchMock.mock.calls.some(([url]) => url.includes('openai.com'))).toBe(false);
  });

  it('returns the prompt alongside an image error', async () => {
    stubFetch({ openAI: Response.json({ error: { code: 'moderation_blocked' } }, { status: 400 }) });
    const res = await post({ locations });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe('CONTENT_REFUSED');
    expect(body.prompt).toContain('2x2 grid');
  });
});
