import { formatTemperature, formatWind, temperatureBand, windBand, type TemperatureBand, type WindBand } from './format';
import type { Weather } from './types';
import { describeWeather } from './weatherCodes';

/** Panel names in slot order: slot 0 is top-left, slot 3 is bottom-right. */
export const PANEL_POSITIONS = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'] as const;

export type Light = 'dawn' | 'day' | 'dusk' | 'night';

const TEMPERATURE_SCENE: Record<TemperatureBand, string> = {
  freezing: 'frost on surfaces, people bundled in heavy coats, visible breath',
  cold: 'people in warm coats and scarves',
  mild: 'people in light jackets',
  warm: 'people in t-shirts, open windows',
  hot: 'shimmering heat haze, people in summer clothes seeking shade',
};

const WIND_WORDS: Record<WindBand, string> = {
  calm: 'calm air',
  breezy: 'a light breeze',
  windy: 'strong wind',
  stormy: 'storm-force wind',
};

const WIND_SCENE: Record<WindBand, string> = {
  calm: 'still air, smoke rising straight up',
  breezy: 'leaves and flags moving gently',
  windy: 'trees bending and flags snapping in the wind',
  stormy: 'trees bending hard and loose things blowing through the air',
};

const LIGHT_SCENE: Record<Light, string> = {
  dawn: 'low pink-gold light of sunrise',
  day: 'daylight',
  dusk: 'low orange light of sunset with long shadows',
  night: 'dark night sky, street lamps and lit windows',
};

/** How close to sunrise/sunset (in minutes) still counts as dawn/dusk light. */
const TWILIGHT_MINUTES = 45;

/**
 * Builds ONE prompt for a 2x2 grid from the weather of the 4 slots, in slot order.
 * Pure: the same weather always gives the same string. Uses only Open-Meteo data
 * (no place names), so nothing typed by a user can end up in the prompt.
 */
export function buildImagePrompt(weathers: Weather[]): string {
  if (weathers.length !== PANEL_POSITIONS.length) {
    throw new Error(`buildImagePrompt needs exactly ${PANEL_POSITIONS.length} locations, got ${weathers.length}.`);
  }

  const intro = [
    'A single square illustration divided into a 2x2 grid of four equal panels, separated by thin white borders.',
    'All four panels share one consistent style: a soft painterly digital illustration of a town street at eye level.',
    'Each panel shows different weather, described below.',
    'Do not include any text, letters, numbers, signs or labels anywhere in the image.',
  ].join(' ');

  const panels = weathers.map((w, i) => `${PANEL_POSITIONS[i]} panel: ${describePanel(w)}`);
  return [intro, ...panels].join('\n\n');
}

function describePanel(w: Weather): string {
  const { label, scene } = describeWeather(w.weatherCode);
  const temp = temperatureBand(w.temperatureC);
  const wind = windBand(w.windKmh);
  const light = lightAt(w);
  const localTime = w.observedAt.slice(11, 16); // "2026-11-17T03:45" -> "03:45"

  const facts =
    `${label}, ${temp} (${formatTemperature(w.temperatureC)}; ` +
    `today ${formatTemperature(w.lowC)} to ${formatTemperature(w.highC)}), ` +
    `${WIND_WORDS[wind]} (${formatWind(w.windKmh)}), ${light} (${localTime} local time).`;
  const show = `Show ${scene}; ${TEMPERATURE_SCENE[temp]}; ${WIND_SCENE[wind]}; ${LIGHT_SCENE[light]}.`;
  return `${facts} ${show}`;
}

/**
 * Day/night comes from Open-Meteo's is_day. Within 45 minutes of that day's
 * sunrise/sunset it becomes dawn/dusk. All times are local to the location.
 */
export function lightAt(w: Pick<Weather, 'isDay' | 'observedAt' | 'sunrise' | 'sunset'>): Light {
  const now = minutesOfDay(w.observedAt);
  if (w.sunrise && Math.abs(now - minutesOfDay(w.sunrise)) <= TWILIGHT_MINUTES) return 'dawn';
  if (w.sunset && Math.abs(now - minutesOfDay(w.sunset)) <= TWILIGHT_MINUTES) return 'dusk';
  return w.isDay ? 'day' : 'night';
}

/** "2026-11-17T06:42" -> 402 */
function minutesOfDay(localIso: string): number {
  return Number(localIso.slice(11, 13)) * 60 + Number(localIso.slice(14, 16));
}
