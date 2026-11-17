# Weather AI Dashboard

Pick 4 places and see the current weather for each. Then generate one AI image: a 2x2 grid where each panel shows that place's weather, light and wind.

- Search for a place by name. Places that share a name are told apart by region and country.
- 4 slots are saved in the browser (localStorage), so they survive a reload.
- Each card shows the temperature, today's low and high, wind, conditions and the local time, always with units (°C, km/h).
- "Generate image" builds a prompt from the 4 forecasts, sends it to OpenAI and shows the image with a legend (which place is in which panel) and the exact prompt used.

Weather data: [Open-Meteo](https://open-meteo.com/) (free, no key). Image: OpenAI Images API (`gpt-image-2` by default).

## Run it

Requires Node.js 20.9 or newer (developed on Node 24).

```bash
npm install
cp .env.example .env    # then set OPENAI_API_KEY in .env
npm run dev             # http://localhost:3000
```

Only the image needs `OPENAI_API_KEY`. Without it, search and weather cards still work, and "Generate image" explains what is missing.

| Variable             | Required | Default       | Purpose                                     |
| -------------------- | -------- | ------------- | ------------------------------------------- |
| `OPENAI_API_KEY`     | for image | –            | OpenAI key, read only on the server         |
| `OPENAI_IMAGE_MODEL` | no       | `gpt-image-2` | Image model (not `gpt-image-1`, which is retired) |
| `IMAGE_TIMEOUT_MS`   | no       | `60000`       | How long to wait for the image              |

## Scripts

```bash
npm test        # vitest, 99 tests
npm run lint
npm run build
```

## How it works

```
Browser (components/, hooks/)        Server (app/api/)                 External
LocationSearch ── GET /api/geocode ──► searchPlaces ───────────────────► Open-Meteo geocoding
LocationCard   ── GET /api/weather ──► getWeather  ────────────────────► Open-Meteo forecast
ImagePanel     ── POST /api/image  ──► getWeather x4 → buildImagePrompt
                  (coordinates only)    → generateImage ───────────────► OpenAI Images
```

| Path | What's in it |
| ---- | ------------ |
| `app/api/*/route.ts` | Thin route handlers: validate input, call `lib/`, return JSON |
| `lib/openMeteo.ts` | Geocoding and forecast calls; checks the response shape and units |
| `lib/imagePrompt.ts` | Pure prompt builder for the 2x2 image |
| `lib/weatherCodes.ts` | WMO weather code → label and scene words |
| `lib/openaiImage.ts` | OpenAI request, config from env, mapping errors to user messages |
| `lib/http.ts` | `fetch` with a timeout, `AppError`, the shared error response |
| `lib/validate.ts`, `format.ts`, `storage.ts`, `apiClient.ts` | Input checks, unit formatting, localStorage, browser-side fetch |
| `components/`, `hooks/useSlots.ts` | Dashboard UI and the 4 saved slots |

## Design decisions

- **Weather numbers come only from Open-Meteo.** `/api/image` takes only coordinates and fetches the weather again on the server, so the browser can't change the numbers in the prompt. Place names are left out of the prompt too, so nothing a user types reaches the image model.
- **The prompt is deterministic.** `buildImagePrompt` is a pure function: the same weather always gives the same text. Temperature, wind and light (dawn, day, dusk or night, based on that day's sunrise and sunset) map to fixed scene words. The image must not contain any text.
- **Units are checked, not assumed.** The forecast reader rejects any response whose units aren't °C and km/h.
- **The API key stays on the server.** It's read with `process.env` inside `/api/image` only, and nothing uses `NEXT_PUBLIC_`. OpenAI's raw error messages go to the server log, never to the browser.
- **Every external call has a timeout.** 8 s for Open-Meteo, 60 s for the image. Timeouts and failures become one error shape, `{ error: { code, message } }`, with a message the user can act on.
- **Failures stay local.** Each weather card loads and fails on its own, and an image error doesn't affect the cards. The content-policy message appears only when OpenAI's error code says the prompt was refused for safety. Any other rejection shows the HTTP status and a short reason.

## Tests

The pure logic in `lib/` has unit tests (prompt builder, weather codes, formatting, validation, storage). The API clients and `/api/image` are tested with a faked `fetch`, covering timeouts, network errors, invalid JSON and each OpenAI error case. No test calls a real external service.

## AI use

Built with Claude Code. [ai-log.md](ai-log.md) records each phase: what I asked for, what the AI did, and the AI mistakes I caught.
