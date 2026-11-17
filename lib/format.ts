import type { Location } from './types';

/** "Springfield, Illinois, United States". Skips the region when missing or same as the name. */
export function formatPlaceLabel(location: Location): string {
  const parts = [location.name];
  if (location.admin1 && location.admin1 !== location.name) parts.push(location.admin1);
  if (location.country) parts.push(location.country);
  return parts.join(', ');
}

export function formatTemperature(celsius: number): string {
  // Math.round(-0.4) is -0, which would print as "-0°C".
  return `${Math.round(celsius) || 0}°C`;
}

export function formatWind(kmh: number): string {
  return `${Math.round(kmh)} km/h`;
}

/**
 * "Tue 09:45" in the given IANA timezone (24h, fixed locale so it reads the
 * same for every visitor). Returns "--:--" if the timezone is not recognised.
 */
export function formatLocalTime(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return '--:--';
  }
}

export type TemperatureBand = 'freezing' | 'cold' | 'mild' | 'warm' | 'hot';

/** Lower bound inclusive: 0 is "cold", 10 is "mild", 18 is "warm", 26 is "hot". */
export function temperatureBand(celsius: number): TemperatureBand {
  if (celsius < 0) return 'freezing';
  if (celsius < 10) return 'cold';
  if (celsius < 18) return 'mild';
  if (celsius < 26) return 'warm';
  return 'hot';
}

export type WindBand = 'calm' | 'breezy' | 'windy' | 'stormy';

/** Lower bound inclusive: 10 is "breezy", 25 is "windy", 45 is "stormy". */
export function windBand(kmh: number): WindBand {
  if (kmh < 10) return 'calm';
  if (kmh < 25) return 'breezy';
  if (kmh < 45) return 'windy';
  return 'stormy';
}
