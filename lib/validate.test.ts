import { describe, expect, it } from 'vitest';
import { parseCoordinate, parseQuery } from './validate';

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
