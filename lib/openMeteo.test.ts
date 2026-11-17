import { describe, expect, it } from 'vitest';
import { mapForecastResponse, mapGeocodingResponse } from './openMeteo';

// Trimmed copies of real Open-Meteo responses.
const geocodingFixture = {
  results: [
    {
      id: 4250542,
      name: 'Springfield',
      latitude: 39.80172,
      longitude: -89.64371,
      country_code: 'US',
      admin1: 'Illinois',
      country: 'United States',
      timezone: 'America/Chicago',
    },
    {
      id: 4409896,
      name: 'Springfield',
      latitude: 37.21533,
      longitude: -93.29824,
      country_code: 'US',
      admin1: 'Missouri',
      country: 'United States',
      timezone: 'America/Chicago',
    },
  ],
  generationtime_ms: 0.9,
};

const forecastFixture = {
  latitude: 39.8,
  longitude: -89.64,
  timezone: 'America/Chicago',
  utc_offset_seconds: -21600,
  current_units: { time: 'iso8601', interval: 'seconds', temperature_2m: '°C', weather_code: 'wmo code', wind_speed_10m: 'km/h', is_day: '' },
  current: { time: '2026-11-17T03:45', interval: 900, temperature_2m: 4.3, weather_code: 61, wind_speed_10m: 18.7, is_day: 0 },
  daily_units: { time: 'iso8601', temperature_2m_max: '°C', temperature_2m_min: '°C' },
  daily: { time: ['2026-11-17'], temperature_2m_max: [9.1], temperature_2m_min: [2.2], sunrise: ['2026-11-17T06:42'], sunset: ['2026-11-17T16:41'] },
};

describe('mapGeocodingResponse', () => {
  it('maps results to Locations', () => {
    const results = mapGeocodingResponse(geocodingFixture);
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: 4250542,
      name: 'Springfield',
      admin1: 'Illinois',
      country: 'United States',
      countryCode: 'US',
      latitude: 39.80172,
      longitude: -89.64371,
    });
    expect(results[1].admin1).toBe('Missouri');
  });

  it('returns [] when Open-Meteo omits results (no match)', () => {
    expect(mapGeocodingResponse({ generationtime_ms: 0.5 })).toEqual([]);
  });

  it('skips results missing required fields', () => {
    const raw = { results: [{ id: 1, name: 'No coordinates' }, geocodingFixture.results[0]] };
    expect(mapGeocodingResponse(raw).map((r) => r.id)).toEqual([4250542]);
  });

  it('throws an UPSTREAM_ERROR on a malformed body', () => {
    expect(() => mapGeocodingResponse('nope')).toThrow(expect.objectContaining({ code: 'UPSTREAM_ERROR' }));
    expect(() => mapGeocodingResponse({ results: 'nope' })).toThrow(expect.objectContaining({ code: 'UPSTREAM_ERROR' }));
  });
});

describe('mapForecastResponse', () => {
  it('maps current, daily and timezone', () => {
    expect(mapForecastResponse(forecastFixture)).toEqual({
      temperatureC: 4.3,
      weatherCode: 61,
      windKmh: 18.7,
      highC: 9.1,
      lowC: 2.2,
      isDay: false,
      timezone: 'America/Chicago',
      observedAt: '2026-11-17T03:45',
      sunrise: '2026-11-17T06:42',
      sunset: '2026-11-17T16:41',
    });
  });

  it('treats missing sunrise/sunset as null instead of failing', () => {
    const raw = { ...forecastFixture, daily: { ...forecastFixture.daily, sunrise: undefined, sunset: [] } };
    expect(mapForecastResponse(raw)).toMatchObject({ sunrise: null, sunset: null });
  });

  it('throws when a value is missing', () => {
    const raw = { ...forecastFixture, current: { ...forecastFixture.current, temperature_2m: null } };
    expect(() => mapForecastResponse(raw)).toThrow(expect.objectContaining({ code: 'UPSTREAM_ERROR' }));
  });

  it('throws when daily arrays are empty', () => {
    const raw = { ...forecastFixture, daily: { ...forecastFixture.daily, temperature_2m_max: [] } };
    expect(() => mapForecastResponse(raw)).toThrow(expect.objectContaining({ code: 'UPSTREAM_ERROR' }));
  });

  it('rejects units other than °C and km/h', () => {
    const raw = { ...forecastFixture, current_units: { ...forecastFixture.current_units, wind_speed_10m: 'mp/h' } };
    expect(() => mapForecastResponse(raw)).toThrow(expect.objectContaining({ code: 'UPSTREAM_ERROR' }));
  });
});
