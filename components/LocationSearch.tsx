'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorMessage, getJson } from '@/lib/apiClient';
import { formatPlaceLabel } from '@/lib/format';
import type { Location } from '@/lib/types';
import { MIN_QUERY_LENGTH, parseQuery } from '@/lib/validate';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; query: string; results: Location[] }
  | { status: 'error'; message: string };

type Props = {
  full: boolean; // all 4 slots taken
  isAdded: (id: number) => boolean;
  onPick: (location: Location) => void;
};

/** Search box + list of matches, so the user can pick the right Springfield. */
export function LocationSearch({ full, isAdded, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const requestRef = useRef<AbortController | null>(null);

  useEffect(() => () => requestRef.current?.abort(), []); // cancel on unmount

  async function search(event?: FormEvent) {
    event?.preventDefault();
    const q = parseQuery(query);
    if (!q) return;

    requestRef.current?.abort(); // only the latest search may update the list
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: 'loading' });

    try {
      const { results } = await getJson<{ results: Location[] }>(
        `/api/geocode?q=${encodeURIComponent(q)}`,
        controller.signal,
      );
      setState({ status: 'done', query: q, results });
    } catch (err) {
      if (!controller.signal.aborted) setState({ status: 'error', message: errorMessage(err) });
    }
  }

  function pick(location: Location) {
    onPick(location);
    setQuery('');
    setState({ status: 'idle' });
  }

  if (full) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
        All 4 slots are full. Remove a location to add another.
      </p>
    );
  }

  const tooShort = parseQuery(query) === null;

  return (
    <section aria-label="Add a location" className="flex flex-col gap-3">
      <form onSubmit={search} className="flex gap-2">
        <label htmlFor="place" className="sr-only">
          Place name
        </label>
        <input
          id="place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a place, e.g. Springfield"
          autoComplete="off"
          maxLength={100}
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={tooShort || state.status === 'loading'}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {state.status === 'loading' ? 'Searching…' : 'Search'}
        </button>
      </form>
      {query.length > 0 && tooShort && (
        <p className="text-sm text-zinc-500">Type at least {MIN_QUERY_LENGTH} characters.</p>
      )}

      {state.status === 'error' && (
        <div role="alert" className="flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
          <span>{state.message}</span>
          <button type="button" onClick={() => search()} className="underline">
            Retry
          </button>
        </div>
      )}

      {state.status === 'done' && state.results.length === 0 && (
        <p role="status" className="text-sm">
          No places found for &ldquo;{state.query}&rdquo;. Check the spelling or try a nearby city.
        </p>
      )}

      {state.status === 'done' && state.results.length > 0 && (
        <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {state.results.map((place) => {
            const added = isAdded(place.id);
            return (
              <li key={place.id}>
                <button
                  type="button"
                  onClick={() => pick(place)}
                  disabled={added}
                  className="flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-zinc-900"
                >
                  <span>{formatPlaceLabel(place)}</span>
                  <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                    {added ? 'Already on your dashboard' : `${place.latitude.toFixed(2)}, ${place.longitude.toFixed(2)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
