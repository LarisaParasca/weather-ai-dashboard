import { describe, expect, it } from 'vitest';
import { formatPlaceLabel, formatTemperature, formatWind, temperatureBand, windBand } from './format';
import type { Location } from './types';

const springfield: Location = {
  id: 4250542,
  name: 'Springfield',
  admin1: 'Illinois',
  country: 'United States',
  countryCode: 'US',
  latitude: 39.80172,
  longitude: -89.64371,
};

describe('formatPlaceLabel', () => {
  it('includes region and country to tell same-named places apart', () => {
    expect(formatPlaceLabel(springfield)).toBe('Springfield, Illinois, United States');
  });

  it('skips a missing region or one equal to the name', () => {
    expect(formatPlaceLabel({ ...springfield, admin1: undefined })).toBe('Springfield, United States');
    expect(formatPlaceLabel({ ...springfield, name: 'Tokyo', admin1: 'Tokyo', country: 'Japan' })).toBe('Tokyo, Japan');
  });
});

describe('formatTemperature / formatWind', () => {
  it('rounds and shows units', () => {
    expect(formatTemperature(12.6)).toBe('13°C');
    expect(formatWind(14.4)).toBe('14 km/h');
  });

  it('never shows "-0°C"', () => {
    expect(formatTemperature(-0.4)).toBe('0°C');
  });
});

describe('temperatureBand', () => {
  it.each([
    [-5, 'freezing'],
    [-0.1, 'freezing'],
    [0, 'cold'],
    [9.9, 'cold'],
    [10, 'mild'],
    [18, 'warm'],
    [26, 'hot'],
    [40, 'hot'],
  ] as const)('%s°C → %s', (celsius, band) => {
    expect(temperatureBand(celsius)).toBe(band);
  });
});

describe('windBand', () => {
  it.each([
    [0, 'calm'],
    [9.9, 'calm'],
    [10, 'breezy'],
    [25, 'windy'],
    [45, 'stormy'],
  ] as const)('%s km/h → %s', (kmh, band) => {
    expect(windBand(kmh)).toBe(band);
  });
});
