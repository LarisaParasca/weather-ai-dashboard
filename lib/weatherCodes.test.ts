import { describe, expect, it } from 'vitest';
import { describeWeather } from './weatherCodes';

describe('describeWeather', () => {
  it('maps known WMO codes', () => {
    expect(describeWeather(0).label).toBe('Clear sky');
    expect(describeWeather(63).label).toBe('Rain');
    expect(describeWeather(95).label).toBe('Thunderstorm');
  });

  it('covers every code Open-Meteo documents', () => {
    const documented = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
    for (const code of documented) {
      expect(describeWeather(code).label, `code ${code}`).not.toBe('Unknown conditions');
    }
  });

  it('falls back for unknown codes instead of throwing', () => {
    expect(describeWeather(42)).toEqual({
      label: 'Unknown conditions',
      emoji: '🌡️',
      scene: 'an ordinary sky',
    });
  });
});
