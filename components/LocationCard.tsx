'use client';

import { useEffect, useState } from 'react';
import { errorMessage, getJson } from '@/lib/apiClient';
import { formatTemperature, formatWind } from '@/lib/format';
import type { Location, Weather } from '@/lib/types';
import { describeWeather } from '@/lib/weatherCodes';
import { LocalClock } from './LocalClock';

type CardState =
  | { status: 'loading' }
  | { status: 'ok'; weather: Weather }
  | { status: 'error'; message: string };

/** One filled slot. Fetches its own weather, so it loads and fails on its own. */
export function LocationCard({ location, onRemove }: { location: Location; onRemove: () => void }) {
  const [state, setState] = useState<CardState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0); // bumped by Retry to re-run the effect
  const { latitude, longitude } = location;

  useEffect(() => {
    const controller = new AbortController();
    getJson<{ weather: Weather }>(`/api/weather?lat=${latitude}&lon=${longitude}`, controller.signal).then(
      ({ weather }) => setState({ status: 'ok', weather }),
      (err) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: errorMessage(err) });
      },
    );
    return () => controller.abort(); // card removed or effect re-run: drop the old request
  }, [latitude, longitude, attempt]);

  function retry() {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }

  const region = [location.admin1, location.country].filter((p) => p && p !== location.name).join(', ');

  return (
    <article className="flex min-h-48 flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">{location.name}</h2>
          {region && <p className="text-sm text-zinc-500">{region}</p>}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${location.name}`}
          className="rounded-md px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        >
          Remove
        </button>
      </header>

      {state.status === 'loading' && <p className="text-sm text-zinc-500">Loading weather…</p>}

      {state.status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p className="text-red-700 dark:text-red-400">
            Couldn&apos;t load weather for {location.name}. {state.message}
          </p>
          <button
            type="button"
            onClick={retry}
            className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === 'ok' && <WeatherDetails weather={state.weather} />}
    </article>
  );
}

function WeatherDetails({ weather }: { weather: Weather }) {
  const { label, emoji } = describeWeather(weather.weatherCode);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-baseline gap-3">
        <span className="text-4xl font-semibold tabular-nums">{formatTemperature(weather.temperatureC)}</span>
        <span>
          <span aria-hidden="true">{emoji}</span> {label}
        </span>
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-zinc-500">Wind</dt>
        <dd className="tabular-nums">{formatWind(weather.windKmh)}</dd>
        <dt className="text-zinc-500">Today</dt>
        <dd className="tabular-nums">
          High {formatTemperature(weather.highC)} · Low {formatTemperature(weather.lowC)}
        </dd>
        <dt className="text-zinc-500">Local time</dt>
        <dd className="tabular-nums">
          <LocalClock timeZone={weather.timezone} />
        </dd>
      </dl>
    </div>
  );
}
