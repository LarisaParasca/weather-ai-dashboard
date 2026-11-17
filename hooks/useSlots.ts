'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { addToFirstEmptySlot, clearSlot, parseSlots, serializeSlots, STORAGE_KEY, type Slots } from '@/lib/storage';
import type { Location } from '@/lib/types';

/*
 * The 4 slots live in localStorage, read through useSyncExternalStore.
 * - The server render has no localStorage, so it gets `undefined` ("not ready yet");
 *   React then re-renders with the real value after hydration, without a mismatch.
 * - The snapshot is the raw string, which compares by value, so React only re-renders
 *   when the saved data actually changes.
 * - If localStorage throws (blocked storage, quota), we keep the slots in memory instead.
 */

const listeners = new Set<() => void>();
let memoryCopy: string | null = null;
let storageFailed = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener('storage', listener); // changes made in another tab
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function readRaw(): string | null {
  if (storageFailed) return memoryCopy;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    storageFailed = true;
    return memoryCopy;
  }
}

function writeRaw(value: string) {
  memoryCopy = value;
  if (!storageFailed) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      storageFailed = true;
    }
  }
  listeners.forEach((notify) => notify());
}

/** Applies a change to the latest saved slots (not a possibly stale render copy). */
function update(change: (slots: Slots) => Slots) {
  writeRaw(serializeSlots(change(parseSlots(readRaw()))));
}

export function useSlots() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => undefined);
  const saved = useSyncExternalStore(subscribe, () => !storageFailed, () => true);
  const slots = useMemo(() => parseSlots(raw), [raw]);

  return {
    /** false during the server render and hydration, before localStorage has been read */
    ready: raw !== undefined,
    slots,
    /** false when the browser blocks localStorage: slots then last until reload only */
    saved,
    add: (location: Location) => update((s) => addToFirstEmptySlot(s, location)),
    remove: (index: number) => update((s) => clearSlot(s, index)),
  };
}
