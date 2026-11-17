'use client';

import { useSyncExternalStore } from 'react';
import { formatLocalTime } from '@/lib/format';

// One tick per second; React only re-renders when the minute changes,
// because the snapshot is the current minute number.
function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

/** Live local time at a location, from its IANA timezone (e.g. "America/Chicago"). */
export function LocalClock({ timeZone }: { timeZone: string }) {
  // null on the server: the time is only known in the browser.
  const minute = useSyncExternalStore(subscribe, currentMinute, () => null);
  if (minute === null) return <span>--:--</span>;
  return <time>{formatLocalTime(new Date(minute * 60_000), timeZone)}</time>;
}
