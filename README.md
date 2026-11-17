# 24order Pro

TV menu (MTV) builder for 24order restaurants, running on Cloudflare Workers.
Phase 1 of a larger plan (AI menu import, improved ordering page, multilingual dashboard).

## What it does today

- **Editor** (`/`): pick the data, a template and the categories; the 1920×1080 board previews live.
  Interface in Arabic (RTL), English, French and Norwegian.
- **TV view** (`/tv.html#…`): full-screen board for a TV. The link carries the screen's settings,
  so no database is needed. It reloads the menu every minute, so price changes show up on their own.
- **Three templates**, styled after the boards we already make:
  - `fire-grid`: logo, red banner title, numbered cards, red M/S price pills, extras bar (Paradis style)
  - `fire-cards`: brush title, cards with yellow prices, optional second section (e.g. *Innbakt pizza*)
  - `panels`: white board, black panels per category (salads, fries, drinks, sauces)
- Text fits itself: long names and ingredient lists shrink until they fit, nothing is cut.

## Data

`/api/menu` always answers in one format (see `scripts/build-demo-data.mjs`):

| `source` | Where from | Has prices / sizes / photos / extras |
|---|---|---|
| `demo` | `public/data/<restaurant>.json` (Paradis Pizza) | yes |
| `live` | 24order AI Agent API `GET /menu` on `*.24order.com` | **no** – the API returns only ids, names and descriptions |

To make live boards complete, 24order needs a read endpoint that returns, per food:
prices per size, photo URL, components (selected / optional) with extra prices, allergies.

## Run locally

```bash
npm install
npx wrangler dev
```

Open http://localhost:8787.

## Deploy (Cloudflare Workers, free plan)

1. Push this repository to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Import a repository → pick this repo.
   Build command: none. Deploy command: `npx wrangler deploy`.
3. Every push to `main` deploys automatically; other branches get preview URLs.

### Secrets

Never put keys in the code or in GitHub. Set them in Cloudflare (Settings → Variables and Secrets)
or with `npx wrangler secret put <NAME>`:

- `STATS_API_KEY`: key for `GET main-server.24order.com/api/v1/stats/clients` (used by `/api/stats`)
- `AI_AGENT_KEY`: key for placing orders (not used yet)
- `GEMINI_API_KEY`: free Google AI Studio key for the AI menu import (next phase)

For local development copy `.dev.vars.example` to `.dev.vars`.

## Project layout

```
src/worker.js            API: /api/menu, /api/stats, /api/health; serves ./public
public/index.html        editor
public/tv.html           TV view
public/js/render.js      board templates + text fitting
public/js/editor.js      editor logic
public/js/i18n.js        AR / EN / FR / NO strings
public/css/board.css     board styles (1920×1080)
public/data/paradis.json demo menu
scripts/                 helpers (demo data generator)
```

## Next phases

1. AI menu import: upload a photo, PDF or Word menu → structured menu → review → add to 24order
   (needs 24order write endpoints).
2. Ordering page: extras and sizes, interactive builder (tap an ingredient, it appears on the food).
3. Dashboard features in four languages.
