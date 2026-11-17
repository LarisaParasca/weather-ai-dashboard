import { describe, expect, it } from 'vitest';
import { addToFirstEmptySlot, clearSlot, EMPTY_SLOTS, parseSlots, serializeSlots, type Slots } from './storage';
import type { Location } from './types';

const loc = (id: number, name = `Place ${id}`): Location => ({
  id,
  name,
  admin1: 'Region',
  country: 'Country',
  countryCode: 'CC',
  latitude: 10,
  longitude: 20,
});

describe('parseSlots', () => {
  it('round-trips through serializeSlots', () => {
    const slots: Slots = [loc(1), null, loc(3), null];
    expect(parseSlots(serializeSlots(slots))).toEqual(slots);
  });

  it('returns empty slots for missing data', () => {
    expect(parseSlots(null)).toEqual(EMPTY_SLOTS);
    expect(parseSlots(undefined)).toEqual(EMPTY_SLOTS);
    expect(parseSlots('')).toEqual(EMPTY_SLOTS);
  });

  it('returns empty slots for corrupt or foreign data instead of throwing', () => {
    expect(parseSlots('{not json')).toEqual(EMPTY_SLOTS);
    expect(parseSlots('{"slots":[]}')).toEqual(EMPTY_SLOTS);
    expect(parseSlots('42')).toEqual(EMPTY_SLOTS);
    expect(parseSlots('null')).toEqual(EMPTY_SLOTS);
  });

  it('empties only the invalid entries', () => {
    const raw = JSON.stringify([loc(1), { id: 'x' }, { ...loc(3), latitude: 200 }, 'junk']);
    expect(parseSlots(raw)).toEqual([loc(1), null, null, null]);
  });

  it('always returns exactly 4 slots', () => {
    expect(parseSlots(JSON.stringify([loc(1)]))).toEqual([loc(1), null, null, null]);
    expect(parseSlots(JSON.stringify([loc(1), loc(2), loc(3), loc(4), loc(5)]))).toHaveLength(4);
  });

  it('drops unknown fields', () => {
    const raw = JSON.stringify([{ ...loc(1), evil: '<script>' }]);
    expect(parseSlots(raw)[0]).toEqual(loc(1));
  });
});

describe('addToFirstEmptySlot', () => {
  it('fills the first empty slot, so a removed slot gets replaced', () => {
    const slots: Slots = [loc(1), null, loc(3), null];
    expect(addToFirstEmptySlot(slots, loc(9))).toEqual([loc(1), loc(9), loc(3), null]);
  });

  it('ignores a location that is already on the dashboard', () => {
    const slots: Slots = [loc(1), null, null, null];
    expect(addToFirstEmptySlot(slots, loc(1))).toBe(slots);
  });

  it('does nothing when all slots are full', () => {
    const slots: Slots = [loc(1), loc(2), loc(3), loc(4)];
    expect(addToFirstEmptySlot(slots, loc(5))).toBe(slots);
  });
});

describe('clearSlot', () => {
  it('empties one slot and keeps the others in place', () => {
    expect(clearSlot([loc(1), loc(2), loc(3), loc(4)], 1)).toEqual([loc(1), null, loc(3), loc(4)]);
  });
});
