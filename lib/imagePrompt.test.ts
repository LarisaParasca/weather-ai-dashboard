import { describe, expect, it } from 'vitest';
import { buildImagePrompt, lightAt } from './imagePrompt';
import type { Weather } from './types';

const base: Weather = {
  temperatureC: 14,
  weatherCode: 0,
  windKmh: 5,
  highC: 17,
  lowC: 9,
  isDay: true,
  timezone: 'Europe/Bucharest',
  observedAt: '2026-11-17T12:00',
  sunrise: '2026-11-17T07:10',
  sunset: '2026-11-17T16:45',
};
const w = (overrides: Partial<Weather>): Weather => ({ ...base, ...overrides });

/** The text of one panel, e.g. panel(prompt, 'Top-right'). */
function panel(prompt: string, position: string): string {
  const line = prompt.split('\n\n').find((p) => p.startsWith(`${position} panel:`));
  if (!line) throw new Error(`no ${position} panel`);
  return line;
}

describe('buildImagePrompt', () => {
  const four = [
    w({ weatherCode: 0 }), // clear
    w({ weatherCode: 63 }), // rain
    w({ weatherCode: 73 }), // snow
    w({ weatherCode: 95 }), // thunderstorm
  ];

  it('describes a 2x2 grid and forbids text in the image', () => {
    const prompt = buildImagePrompt(four);
    expect(prompt).toContain('2x2 grid of four equal panels');
    expect(prompt).toContain('Do not include any text');
  });

  it('puts one panel per location in slot order: TL, TR, BL, BR', () => {
    const prompt = buildImagePrompt(four);
    const order = ['Top-left', 'Top-right', 'Bottom-left', 'Bottom-right'].map((p) => prompt.indexOf(`${p} panel:`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    expect(panel(prompt, 'Top-left')).toContain('Clear sky');
    expect(panel(prompt, 'Top-right')).toContain('Rain');
    expect(panel(prompt, 'Bottom-left')).toContain('Snow');
    expect(panel(prompt, 'Bottom-right')).toContain('Thunderstorm');
  });

  it('shows how warm or cold it is, with the real numbers', () => {
    const prompt = buildImagePrompt([
      w({ temperatureC: -8, lowC: -12, highC: -3 }),
      w({ temperatureC: 33, lowC: 24, highC: 36 }),
      w({}),
      w({}),
    ]);
    expect(panel(prompt, 'Top-left')).toContain('freezing (-8°C; today -12°C to -3°C)');
    expect(panel(prompt, 'Top-left')).toContain('visible breath');
    expect(panel(prompt, 'Top-right')).toContain('hot (33°C; today 24°C to 36°C)');
    expect(panel(prompt, 'Top-right')).toContain('heat haze');
  });

  it('shows the wind', () => {
    const prompt = buildImagePrompt([w({ windKmh: 2 }), w({ windKmh: 60 }), w({}), w({})]);
    expect(panel(prompt, 'Top-left')).toContain('calm air (2 km/h)');
    expect(panel(prompt, 'Top-left')).toContain('smoke rising straight up');
    expect(panel(prompt, 'Top-right')).toContain('storm-force wind (60 km/h)');
    expect(panel(prompt, 'Top-right')).toContain('trees bending hard');
  });

  it('shows day or night with the local time', () => {
    const prompt = buildImagePrompt([
      w({ isDay: true, observedAt: '2026-11-17T12:00' }),
      w({ isDay: false, observedAt: '2026-11-17T23:30' }),
      w({}),
      w({}),
    ]);
    expect(panel(prompt, 'Top-left')).toContain('day (12:00 local time)');
    expect(panel(prompt, 'Top-right')).toContain('night (23:30 local time)');
    expect(panel(prompt, 'Top-right')).toContain('street lamps');
  });

  it('never contains undefined or NaN, even for an unknown weather code', () => {
    const prompt = buildImagePrompt([w({ weatherCode: 42, sunrise: null, sunset: null }), w({}), w({}), w({})]);
    expect(prompt).toContain('Unknown conditions');
    expect(prompt).not.toMatch(/undefined|NaN|null/);
  });

  it('is deterministic', () => {
    expect(buildImagePrompt(four)).toBe(buildImagePrompt(four));
  });

  it('requires exactly 4 locations', () => {
    expect(() => buildImagePrompt(four.slice(0, 3))).toThrow('exactly 4');
  });
});

describe('lightAt', () => {
  it('uses is_day away from sunrise and sunset', () => {
    expect(lightAt(w({ isDay: true, observedAt: '2026-11-17T12:00' }))).toBe('day');
    expect(lightAt(w({ isDay: false, observedAt: '2026-11-17T02:00' }))).toBe('night');
  });

  it('is dawn within 45 minutes of sunrise, either side', () => {
    expect(lightAt(w({ isDay: false, observedAt: '2026-11-17T06:30' }))).toBe('dawn'); // sunrise 07:10
    expect(lightAt(w({ isDay: true, observedAt: '2026-11-17T07:55' }))).toBe('dawn');
    expect(lightAt(w({ isDay: true, observedAt: '2026-11-17T08:00' }))).toBe('day');
  });

  it('is dusk within 45 minutes of sunset, either side', () => {
    expect(lightAt(w({ isDay: true, observedAt: '2026-11-17T16:15' }))).toBe('dusk'); // sunset 16:45
    expect(lightAt(w({ isDay: false, observedAt: '2026-11-17T17:30' }))).toBe('dusk');
    expect(lightAt(w({ isDay: false, observedAt: '2026-11-17T17:45' }))).toBe('night');
  });

  it('falls back to is_day when sunrise/sunset are unknown', () => {
    expect(lightAt(w({ isDay: true, observedAt: '2026-11-17T07:10', sunrise: null, sunset: null }))).toBe('day');
  });
});
