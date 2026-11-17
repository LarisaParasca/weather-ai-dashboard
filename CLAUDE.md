# Project rules
- Next.js App Router + TypeScript. Keep it small and readable — this code will be reviewed line by line in an interview.
- API keys ONLY on the server (process.env in route handlers). Never NEXT_PUBLIC_ for secrets. Keep .env.example up to date.
- Weather numbers come only from Open-Meteo, never from an LLM.
- Always show units: °C, km/h.
- Every external call (geocoding, forecast, image) has a timeout and returns a clear, user-facing error. One failing card must never break the rest of the page.
- Pure logic (prompt builder, weather-code mapping) lives in /lib and has unit tests (vitest).
- Don't commit. Stop after each task and summarise which files changed and why.
- After each phase, append an entry to ai-log.md in the agreed format: Asked for / AI did / AI mistakes caught.