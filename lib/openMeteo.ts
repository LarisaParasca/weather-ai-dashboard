import { AppError, fetchJson, isFiniteNumber, isRecord } from './http';
import type { Location, Weather } from './types';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 8_000;

const GEOCODING = 'place search service';
const FORECAST = 'weather service';

export async function searchPlaces(query: string): Promise<Location[]> {
  const params = new URLSearchParams({ name: query, count: '10', language: 'en', format: 'json' });
  const raw = await fetchJson(`${GEOCODING_URL}?${params}`, { service: GEOCODING, timeoutMs: TIMEOUT_MS });
  return mapGeocodingResponse(raw);
}

export async function getWeather(latitude: number, longitude: number): Promise<Weather> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: 'temperature_2m,weather_code,wind_speed_10m,is_day',
    daily: 'temperature_2m_max,temperature_2m_min',
    timezone: 'auto', // local timezone, so "today" means today at that location
    forecast_days: '1',
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
  });
  const raw = await fetchJson(`${FORECAST_URL}?${params}`, { service: FORECAST, timeoutMs: TIMEOUT_MS });
  return mapForecastResponse(raw);
}

/**
 * Open-Meteo omits `results` entirely when nothing matches, so that maps to [].
 * Individual results missing a required field are skipped rather than failing the search.
 */
export function mapGeocodingResponse(raw: unknown): Location[] {
  if (!isRecord(raw)) throw unexpected(GEOCODING);
  if (raw.results === undefined) return [];
  if (!Array.isArray(raw.results)) throw unexpected(GEOCODING);

  return raw.results.flatMap((r): Location[] => {
    if (
      !isRecord(r) ||
      !isFiniteNumber(r.id) ||
      typeof r.name !== 'string' ||
      !isFiniteNumber(r.latitude) ||
      !isFiniteNumber(r.longitude)
    ) {
      return [];
    }
    return [
      {
        id: r.id,
        name: r.name,
        admin1: typeof r.admin1 === 'string' ? r.admin1 : undefined,
        country: typeof r.country === 'string' ? r.country : '',
        countryCode: typeof r.country_code === 'string' ? r.country_code : '',
        latitude: r.latitude,
        longitude: r.longitude,
      },
    ];
  });
}

/**
 * Validates the forecast and checks the units, so the UI can label values
 * °C and km/h knowing that is what Open-Meteo actually sent.
 */
export function mapForecastResponse(raw: unknown): Weather {
  if (!isRecord(raw) || !isRecord(raw.current) || !isRecord(raw.daily) || !isRecord(raw.current_units)) {
    throw unexpected(FORECAST);
  }
  const { current, daily, current_units: units } = raw;
  const high = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[0] : undefined;
  const low = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[0] : undefined;

  if (
    !isFiniteNumber(current.temperature_2m) ||
    !isFiniteNumber(current.weather_code) ||
    !isFiniteNumber(current.wind_speed_10m) ||
    !isFiniteNumber(current.is_day) ||
    typeof current.time !== 'string' ||
    !isFiniteNumber(high) ||
    !isFiniteNumber(low) ||
    typeof raw.timezone !== 'string'
  ) {
    throw unexpected(FORECAST);
  }
  if (units.temperature_2m !== '°C' || units.wind_speed_10m !== 'km/h') {
    throw unexpected(FORECAST);
  }

  return {
    temperatureC: current.temperature_2m,
    weatherCode: current.weather_code,
    windKmh: current.wind_speed_10m,
    highC: high,
    lowC: low,
    isDay: current.is_day === 1,
    timezone: raw.timezone,
    observedAt: current.time,
  };
}

function unexpected(service: string): AppError {
  return new AppError('UPSTREAM_ERROR', `Unexpected response from the ${service}.`, 502);
}
