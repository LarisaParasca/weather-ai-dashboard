'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ApiRequestError, errorMessage, postJson } from '@/lib/apiClient';
import { isRecord } from '@/lib/http';
import { PANEL_POSITIONS } from '@/lib/imagePrompt';
import type { Slots } from '@/lib/storage';
import type { Location } from '@/lib/types';

type ImageState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; prompt: string; image: string; locations: Location[] }
  | { status: 'error'; message: string; prompt?: string };

/** "Generate image" button, then the image with its legend and the exact prompt used. */
export function ImagePanel({ slots }: { slots: Slots }) {
  const [state, setState] = useState<ImageState>({ status: 'idle' });
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []); // cancel on unmount

  const filled = slots.filter((s): s is Location => s !== null);
  const missing = slots.length - filled.length;
  const loading = state.status === 'loading';

  async function generate() {
    if (missing > 0) return;
    const locations = filled; // snapshot: the legend must match the image, even if slots change later
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: 'loading' });

    try {
      const { prompt, image } = await postJson<{ prompt: string; image: string }>(
        '/api/image',
        { locations: locations.map(({ latitude, longitude }) => ({ latitude, longitude })) },
        controller.signal,
      );
      setState({ status: 'ok', prompt, image, locations });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({ status: 'error', message: errorMessage(err), prompt: promptFromError(err) });
    }
  }

  // The image was made for other locations than the ones on the dashboard now.
  const outdated =
    state.status === 'ok' && state.locations.map((l) => l.id).join() !== slots.map((s) => s?.id).join();

  return (
    <section aria-label="Weather image" className="flex flex-col gap-4 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Weather image</h2>
        <button
          type="button"
          onClick={generate}
          disabled={missing > 0 || loading}
          className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {loading ? 'Generating…' : state.status === 'ok' ? 'Generate again' : 'Generate image'}
        </button>
        {missing > 0 && (
          <p className="text-sm text-zinc-500">
            Add {missing} more location{missing === 1 ? '' : 's'} to generate an image.
          </p>
        )}
        {loading && (
          <p role="status" className="text-sm text-zinc-500">
            Fetching fresh weather and drawing the image. This can take up to a minute.
          </p>
        )}
      </div>

      {state.status === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm">
          <p className="text-red-700 dark:text-red-400">{state.message}</p>
          <button
            type="button"
            onClick={generate}
            disabled={missing > 0}
            className="rounded-md border border-zinc-300 px-3 py-1 hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Retry
          </button>
          {state.prompt && <PromptBlock prompt={state.prompt} />}
        </div>
      )}

      {state.status === 'ok' && (
        <div className="grid gap-4 md:grid-cols-2">
          <figure className="flex flex-col gap-2">
            <Image
              src={`data:image/jpeg;base64,${state.image}`}
              alt={`AI-generated 2x2 illustration of the weather in ${state.locations.map((l) => l.name).join(', ')}`}
              width={1024}
              height={1024}
              unoptimized
              className="h-auto w-full rounded-lg"
            />
            <figcaption>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {state.locations.map((l, i) => (
                  <li key={l.id}>
                    <span className="text-zinc-500">{PANEL_POSITIONS[i]}:</span> {l.name}
                  </li>
                ))}
              </ul>
              {outdated && (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                  Your locations changed since this image was made. Generate again to update it.
                </p>
              )}
            </figcaption>
          </figure>
          <PromptBlock prompt={state.prompt} />
        </div>
      )}
    </section>
  );
}

function PromptBlock({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-medium">Prompt sent to the image model</h3>
      <pre className="whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-900">
        {prompt}
      </pre>
    </div>
  );
}

/** /api/image includes the prompt in its error body when it got that far. */
function promptFromError(err: unknown): string | undefined {
  if (err instanceof ApiRequestError && isRecord(err.body) && typeof err.body.prompt === 'string') {
    return err.body.prompt;
  }
  return undefined;
}
