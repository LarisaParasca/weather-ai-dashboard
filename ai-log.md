# AI log

How AI (Claude Code, Claude Opus 5.5) was used in this project, one entry per phase.

## Phase 0 — Planning and repo setup
- **Asked for:** a plan from the brief and my stack decisions (Next.js + TypeScript, Open-Meteo, OpenAI images, localStorage, vitest), with no code yet.
- **AI did:**
  - Wrote the plan in plan mode: file structure, API routes with one error shape, the exact Open-Meteo parameters, a fixed prompt template for a 2x2 grid with no text in the image, an 18-row failure table, and 5 phases.
  - Proposed that `/api/image` fetches the weather again on the server, so the numbers in the prompt can't be changed in the browser.
  - Read the Next 16 docs bundled in `node_modules` before planning the routes, because AGENTS.md says the APIs differ from older versions.
  - After I approved the plan and chose to move the app to the repo root: moved it with `git mv` so history is kept, stopped tracking `.DS_Store`, renamed `claude.md` to `CLAUDE.md`, and checked that `npm install && npm run dev` work from the root.
- **AI mistakes caught:** none at this stage. The plan missed that the scaffold's `.gitignore` line `.env*` would also ignore `.env.example`; this was caught and fixed in Phase 1.

## Phase 1 — Open-Meteo routes and lib/
- **Asked for:** `lib/` logic, `/api/geocode`, `/api/weather` and unit tests.
- **AI did:**
  - Wrote `lib/http.ts` (fetch with a timeout; 504/502 errors that name the service; one JSON error shape), `lib/openMeteo.ts`, `lib/weatherCodes.ts`, `lib/format.ts` and `lib/validate.ts`, plus the two routes.
  - Made the forecast reader reject any units other than °C and km/h, so the units shown in the UI are checked, not assumed.
  - Wrote 39 vitest tests using trimmed real Open-Meteo responses and a faked `fetch` (timeout, network error, non-2xx, invalid JSON).
  - Changes from the plan: dropped `timezone` from `Location` and `condition` from `Weather`, added an `INTERNAL` error code, and raised `@types/node` from `^20` to `^24`, because vitest 5 would not install alongside `^20`.
- **AI mistakes caught:**
  - Reported the production build as clean after reading only the last 15 lines of its output. The build actually logged prerender errors from both routes. Found and fixed in Phase 2.
  - The first vitest config caused a Vite ESM warning; fixed by renaming it to `vitest.config.mts`.
  - The plan's `.gitignore` gap: added `!.env.example`.

## Phase 2 — Dashboard UI: search, 4 slots, weather cards
- **Asked for:** the dashboard UI: place search with a list of matches, 4 slots saved in localStorage, and one weather card per slot that loads and fails on its own. No image yet.
- **AI did:**
  - Wrote `Dashboard`, `LocationSearch`, `LocationCard`, `LocalClock`, the `useSlots` hook, `lib/storage.ts` (never throws on missing or corrupt data) and `lib/apiClient.ts`, with tests. 58 tests in total.
  - Used `useSyncExternalStore` instead of `useEffect` to read localStorage and the clock, because the scaffold's lint config (react-hooks 7) forbids setting state directly inside an effect. This also avoids a mismatch between the server render and the first client render.
  - Changes from the plan: localStorage handling moved into `hooks/useSlots.ts`; one search box that fills the first empty slot instead of per-slot "Add" buttons; search runs on submit instead of while typing; local time is always 24-hour `en-GB`. This phase also covered the plan's Phase 3 (weather cards).
- **AI mistakes caught:**
  - Fixed the Phase 1 build error. Both routes read `searchParams` inside `try/catch`, so the catch swallowed the internal signal Next uses to mark a route dynamic, and logged it as an unexpected error. Fixed by reading `searchParams` before the `try`.
  - The UI was not tested in a browser by the AI (no browser in the session); the checklist for checking it by hand went to me.

## Phase 3 — AI image from the 4 locations
- **Asked for:** a pure `buildImagePrompt()` for one 2x2 image, a `POST /api/image` that fetches the weather on the server and calls OpenAI, clear errors in the shared shape, the "Generate image" UI with a prompt and legend, and tests.
- **AI did:**
  - Checked OpenAI's current docs before choosing a model. `gpt-image-1` (the plan's default) was shut down on 2026-10-23, so the default is now `gpt-image-2.5-flare` (OpenAI's named fast replacement), with 1024x1024, `quality: low` and JPEG output to keep it fast and cheap.
  - Wrote `lib/imagePrompt.ts` (fixed template; words and scene details for weather, temperature, wind and light; no place names, so only Open-Meteo data reaches the prompt), `lib/openaiImage.ts` (request, config from env, error mapping), `app/api/image/route.ts` and `components/ImagePanel.tsx`.
  - Added `sunrise`/`sunset` to the forecast so dawn and dusk come from real data; the error mapping decides on HTTP status first, because OpenAI's docs don't confirm every error code string.
  - Wrote 37 more tests (95 in total), including a route test with a faked `fetch`. Ran the route against the real OpenAI API with a fake key: the missing-key, invalid-key and timeout responses match.
- **AI mistakes caught:**
  - The plan's default model `gpt-image-1` no longer exists; found by checking the docs before writing the code.
  - The first prompt said "windy wind (35 km/h)"; found by reading a prompt built from live weather, and reworded.
  - The build failed on numbered duplicate files (`routes.d 2.ts`) in `.next/`, most likely created by iCloud syncing `Documents`. Not a code error; fixed by deleting `.next/`.
  - The 403, 404 (unknown model), refusal and quota messages were tested only with fake responses. A fake key can't reach those errors, because OpenAI checks the key first.
  - The error mapping guessed from the HTTP status and error type instead of the error code, and reported a retired model (`OPENAI_IMAGE_MODEL=gpt-image-1` in my `.env`) as a content-policy refusal. Found by me testing by hand. Fixed: the content-policy message now needs the code `moderation_blocked` or `content_policy_violation`; any other 400 shows "The image provider rejected the request (HTTP 400): <code (param)>", and a model error also says to check `OPENAI_IMAGE_MODEL`. Added 4 tests. The code default was changed from `gpt-image-2.5-flare` (never called for real) to `gpt-image-2` (confirmed working by hand).
