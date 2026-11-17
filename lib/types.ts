/** A place picked from geocoding results. `id` is Open-Meteo's geonames id. */
export type Location = {
  id: number;
  name: string;
  admin1?: string; // state / region, used to tell the Springfields apart
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
};

/** Current weather for one location. Every number comes from Open-Meteo. */
export type Weather = {
  temperatureC: number;
  weatherCode: number; // WMO code, see lib/weatherCodes.ts
  windKmh: number;
  highC: number; // today's max, in the location's own day
  lowC: number; // today's min
  isDay: boolean;
  timezone: string; // IANA name, e.g. "America/Chicago"
  observedAt: string; // local ISO time of the reading, e.g. "2026-11-17T09:45"
  sunrise: string | null; // local ISO time, null if Open-Meteo has none (polar day/night)
  sunset: string | null;
};

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_ERROR'
  | 'CONTENT_REFUSED'
  | 'RATE_LIMITED'
  | 'NOT_CONFIGURED'
  | 'INVALID_API_KEY'
  | 'INTERNAL';

/**
 * The single error shape every API route returns. `prompt` is only set by
 * /api/image when the prompt was built before the failure, so the UI can show it.
 */
export type ApiErrorBody = {
  error: { code: ErrorCode; message: string };
  prompt?: string;
};

/** One location as sent to /api/image: coordinates only, nothing the prompt could echo. */
export type Coordinates = { latitude: number; longitude: number };
