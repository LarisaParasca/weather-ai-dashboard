import { describe, expect, it } from 'vitest';
import { parseCoordinate, parseImageRequest, parseQuery } from './validate';

describe('parseQuery', () => {
  it('trims and accepts 2–100 characters', () => {
    expect(parseQuery('  Springfield ')).toBe('Springfield');
    expect(parseQuery('Ny')).toBe('Ny');
  });

  it('rejects missing, too short or too long input', () => {
    expect(parseQuery(null)).toBeNull();
    expect(parseQuery(' a ')).toBeNull();
    expect(parseQuery('x'.repeat(101))).toBeNull();
  });
});

describe('parseCoordinate', () => {
  it('parses values inside the limit', () => {
    expect(parseCoordinate('39.8', 90)).toBe(39.8);
    expect(parseCoordinate('-179.5', 180)).toBe(-179.5);
  });

  it('rejects missing, empty, non-numeric and out-of-range values', () => {
    expect(parseCoordinate(null, 90)).toBeNull();
    expect(parseCoordinate('', 90)).toBeNull(); // Number('') would be 0
    expect(parseCoordinate('abc', 90)).toBeNull();
    expect(parseCoordinate('Infinity', 180)).toBeNull();
    expect(parseCoordinate('91', 90)).toBeNull();
  });
});

describe('parseImageRequest', () => {
  const four = [
    { latitude: 45.75, longitude: 21.23 },
    { latitude: 35.68, longitude: 139.69 },
    { latitude: 64.14, longitude: -21.9 },
    { latitude: -33.92, longitude: 18.42 },
  ];

  it('returns only the coordinates, in order', () => {
    const body = { locations: four.map((c) => ({ ...c, name: 'ignore me' })) };
    expect(parseImageRequest(body, 4)).toEqual(four);
  });

  it('rejects the wrong count, a bad shape or out-of-range values', () => {
    expect(parseImageRequest(null, 4)).toBeNull();
    expect(parseImageRequest({ locations: four.slice(0, 3) }, 4)).toBeNull();
    expect(parseImageRequest({ locations: [...four.slice(0, 3), { latitude: '1', longitude: 2 }] }, 4)).toBeNull();
    expect(parseImageRequest({ locations: [...four.slice(0, 3), { latitude: 91, longitude: 0 }] }, 4)).toBeNull();
  });
});
