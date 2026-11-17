import { isFiniteNumber, isRecord } from './http';
import type { Location } from './types';

/** Bump the version if the saved shape changes; old data is then ignored. */
export const STORAGE_KEY = 'weather-dashboard:slots:v1';
export const SLOT_COUNT = 4;

/** Always exactly 4 entries. Index = grid position (0 top-left … 3 bottom-right). */
export type Slots = (Location | null)[];

export const EMPTY_SLOTS: Slots = Array(SLOT_COUNT).fill(null);

/**
 * Reads whatever is in localStorage and never throws. Missing, corrupt or
 * foreign data gives empty slots; an invalid entry empties only that slot.
 */
export function parseSlots(raw: string | null | undefined): Slots {
  if (!raw) return EMPTY_SLOTS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_SLOTS;
  }
  if (!Array.isArray(data)) return EMPTY_SLOTS;
  return Array.from({ length: SLOT_COUNT }, (_, i) => toLocation(data[i]));
}

export function serializeSlots(slots: Slots): string {
  return JSON.stringify(slots);
}

/** Puts the location in the first empty slot. No-op if all slots are full or it is already there. */
export function addToFirstEmptySlot(slots: Slots, location: Location): Slots {
  const index = slots.indexOf(null);
  if (index === -1 || slots.some((s) => s?.id === location.id)) return slots;
  return slots.map((s, i) => (i === index ? location : s));
}

export function clearSlot(slots: Slots, index: number): Slots {
  return slots.map((s, i) => (i === index ? null : s));
}

/** Rebuilds a Location from untrusted data, keeping only known fields. */
function toLocation(value: unknown): Location | null {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.id) ||
    typeof value.name !== 'string' ||
    typeof value.country !== 'string' ||
    typeof value.countryCode !== 'string' ||
    !isFiniteNumber(value.latitude) ||
    !isFiniteNumber(value.longitude) ||
    Math.abs(value.latitude) > 90 ||
    Math.abs(value.longitude) > 180
  ) {
    return null;
  }
  return {
    id: value.id,
    name: value.name,
    admin1: typeof value.admin1 === 'string' ? value.admin1 : undefined,
    country: value.country,
    countryCode: value.countryCode,
    latitude: value.latitude,
    longitude: value.longitude,
  };
}
