'use client';

import { useSlots } from '@/hooks/useSlots';
import { PANEL_POSITIONS } from '@/lib/imagePrompt';
import { ImagePanel } from './ImagePanel';
import { LocationCard } from './LocationCard';
import { LocationSearch } from './LocationSearch';

export function Dashboard() {
  const { ready, slots, saved, add, remove } = useSlots();
  const addedIds = new Set(slots.flatMap((s) => (s ? [s.id] : [])));

  return (
    <div className="flex flex-col gap-6">
      {ready && <LocationSearch full={addedIds.size === slots.length} isAdded={(id) => addedIds.has(id)} onPick={add} />}

      {!saved && (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Your browser is blocking local storage, so these locations won&apos;t be kept after a reload.
        </p>
      )}

      {/* Slot order is the grid order, and later the image's panel order. */}
      <section aria-label="Your locations" className="grid gap-4 sm:grid-cols-2">
        {slots.map((location, i) =>
          location ? (
            <LocationCard key={location.id} location={location} onRemove={() => remove(i)} />
          ) : (
            <div
              key={`empty-${i}`}
              className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700"
            >
              {ready ? `${PANEL_POSITIONS[i]}: empty. Search above to add a place.` : 'Loading…'}
            </div>
          ),
        )}
      </section>

      {ready && <ImagePanel slots={slots} />}
    </div>
  );
}
