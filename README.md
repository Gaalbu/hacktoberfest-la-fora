# Lá Fora

A small, bilingual observation mission for taking a mindful break close to home. Choose a few minutes, a familiar place and a focus; Gemma suggests one question and three simple steps. Save the mission, put your phone away, then record what you noticed.

**Status:** MVP in progress. Live Gemma generation requires a free Gemini API key on the server. The project does not include a bundled demo response or claim a completed field test.

## Run locally

Requirements: Node.js 22.12+.

```sh
npm install
cp .env.example .env
# Add your free API key to .env (server-side only)
npm run dev
```

Open http://localhost:3000. The app stores only the latest mission and its notes in this browser's local storage. It does not request a precise location, use an account, or save data to a database. A new mission needs an internet connection.

## Configuration

- `GEMINI_API_KEY`: API key read only by the Node server. Never use a `VITE_` prefix or commit `.env`.
- `GEMMA_MODEL`: supported Gemma model ID; defaults to `gemma-4-26b-a4b-it`.
- `PORT`: optional HTTP port; the host-provided port is used when deployed.

The API limits each running process to 12 mission requests per minute and rejects context longer than 200 characters. This in-memory limit resets when the process restarts and is not a global quota or billing control. A small screen disclaimer asks users to stay in a familiar, permitted place; generated activities are still reviewed for obvious unsafe instructions. Use your judgment and stop if anything feels unsafe.

## Check

```sh
npm test
npm run typecheck
npm run build
```

## Stack and attribution

React, Vite, TypeScript and Express. Mission generation uses Google's Gemma through the Gemini API; the model weights are open, while hosted inference uses Google's API and its current terms/quota. The application itself is MIT licensed. No map, GPS, wildlife identification, health claim, activity tracking, user account or analytics is included.
