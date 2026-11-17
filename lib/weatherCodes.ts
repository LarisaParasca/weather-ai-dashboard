/**
 * WMO weather interpretation codes, as returned by Open-Meteo's `weather_code`.
 * https://open-meteo.com/en/docs (section "WMO Weather interpretation codes")
 *
 * `label` is shown on the card; `scene` is used later by the image prompt builder.
 */
export type WeatherDescription = { label: string; emoji: string; scene: string };

const CLEAR = 'a clear open sky with crisp shadows';
const CLOUDY = 'soft clouds drifting across the sky';
const OVERCAST = 'a flat grey overcast sky and muted colours';
const FOG = 'soft fog hiding the distance and blurring lights';
const DRIZZLE = 'damp pavements and a fine misty drizzle';
const FREEZING = 'glazed icy surfaces and frozen droplets on railings';
const RAIN = 'wet reflective streets, rain streaks and people with umbrellas';
const SNOW = 'falling snow settling on rooftops and streets';
const SHOWERS = 'passing rain showers with breaks of light between dark clouds';
const STORM = 'dark storm clouds, lightning and heavy rain';

const CODES: Record<number, WeatherDescription> = {
  0: { label: 'Clear sky', emoji: '☀️', scene: CLEAR },
  1: { label: 'Mainly clear', emoji: '🌤️', scene: CLEAR },
  2: { label: 'Partly cloudy', emoji: '⛅', scene: CLOUDY },
  3: { label: 'Overcast', emoji: '☁️', scene: OVERCAST },
  45: { label: 'Fog', emoji: '🌫️', scene: FOG },
  48: { label: 'Freezing fog', emoji: '🌫️', scene: FOG },
  51: { label: 'Light drizzle', emoji: '🌦️', scene: DRIZZLE },
  53: { label: 'Drizzle', emoji: '🌦️', scene: DRIZZLE },
  55: { label: 'Heavy drizzle', emoji: '🌧️', scene: DRIZZLE },
  56: { label: 'Light freezing drizzle', emoji: '🧊', scene: FREEZING },
  57: { label: 'Freezing drizzle', emoji: '🧊', scene: FREEZING },
  61: { label: 'Light rain', emoji: '🌦️', scene: RAIN },
  63: { label: 'Rain', emoji: '🌧️', scene: RAIN },
  65: { label: 'Heavy rain', emoji: '🌧️', scene: RAIN },
  66: { label: 'Light freezing rain', emoji: '🧊', scene: FREEZING },
  67: { label: 'Freezing rain', emoji: '🧊', scene: FREEZING },
  71: { label: 'Light snow', emoji: '🌨️', scene: SNOW },
  73: { label: 'Snow', emoji: '🌨️', scene: SNOW },
  75: { label: 'Heavy snow', emoji: '❄️', scene: SNOW },
  77: { label: 'Snow grains', emoji: '🌨️', scene: SNOW },
  80: { label: 'Light rain showers', emoji: '🌦️', scene: SHOWERS },
  81: { label: 'Rain showers', emoji: '🌧️', scene: SHOWERS },
  82: { label: 'Violent rain showers', emoji: '⛈️', scene: STORM },
  85: { label: 'Light snow showers', emoji: '🌨️', scene: SNOW },
  86: { label: 'Heavy snow showers', emoji: '❄️', scene: SNOW },
  95: { label: 'Thunderstorm', emoji: '⛈️', scene: STORM },
  96: { label: 'Thunderstorm with hail', emoji: '⛈️', scene: STORM },
  99: { label: 'Thunderstorm with heavy hail', emoji: '⛈️', scene: STORM },
};

const UNKNOWN: WeatherDescription = {
  label: 'Unknown conditions',
  emoji: '🌡️',
  scene: 'an ordinary sky',
};

export function describeWeather(code: number): WeatherDescription {
  return CODES[code] ?? UNKNOWN;
}
