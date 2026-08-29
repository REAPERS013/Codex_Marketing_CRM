# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This repo is **frontend-only** despite appearances. The active workspace is `frontend/` (Next.js 15 / React 19 / TypeScript). The top-level `config/`, `hub/`, `templates/`, `static/` directories are leftover Django scaffolding and contain nothing but `__pycache__` — do not add code there or assume a backend lives in this repo. The Django backend referenced by the frontend is a separate service (Crush.lu).

All commands below run from `frontend/`.

## Commands

```bash
cd frontend
npm install
npm run dev      # local dev server (Next.js)
npm run build    # static export → frontend/out (deploy artifact)
npm run lint     # eslint via next lint
```

There is no test runner configured — `npm test` does not exist.

`NEXT_PUBLIC_API_BASE_URL` must be set for any API call to work. Local dev defaults to `http://localhost:8000` when `NODE_ENV=development` (see `lib/api/client.ts`); copy `.env.local.example` to `.env.local` to override. CI sets it per environment in `.github/workflows/azure-static-web-apps-*.yml` (PRs → `https://test.crush.lu`, main → `https://crush.lu`).

## Architecture

### Static export, not SSR
`next.config.ts` sets `output: "export"` and `trailingSlash: true`. The build emits a fully static site to `frontend/out/` which Azure Static Web Apps serves. **Do not introduce server actions, route handlers, dynamic server-rendered pages, or anything else incompatible with `next export`** — it will break the deploy. Anything dynamic (search params, auth state) must be client-side, and `useSearchParams()` must be wrapped in `<Suspense>` (see `app/auth/callback/page.tsx`).

### Data flow: HubProvider, no mock fallback
`app/layout.tsx` mounts `AppFrame`, which wraps every page in `HubProvider` (`lib/hub-provider.tsx`). The provider calls `fetchHubData()` (`lib/api/hub.ts`), which:

1. If no access token in localStorage → returns `null`. Provider keeps empty state and exposes `authenticated: false`.
2. Otherwise fetches `/hub/me`, `/hub/requests`, `/hub/resources`, `/hub/timeline` in parallel.
3. On any API failure → the error propagates; provider sets `error` and stays empty. **There is no mock fallback.** Pages render their empty states honestly.

Pages consume this via `useHubData()`. Metrics shown on the dashboard are **derived client-side** in `deriveMetrics()` from the loaded requests/resources — they are not a separate endpoint.

Mock-only entities (`locations`, `paymentsIn`, `paymentsOut`, `payroll`, `refunds`, `eventProfitability`) are still exposed on the context for typing compatibility, but they are hard-coded to empty arrays — the corresponding pages (`/locations`, `/accounting`) render blank until those endpoints are added to `lib/api/contracts.ts` and threaded into `fetchHubData()`. When adding a new domain entity, add it to `lib/types.ts`, the API contract types in `lib/api/contracts.ts`, the `fetchHubData()` parallel fetch, and the provider state — all four must stay in sync.

### Authentication: two flows, one token store
Both flows in `lib/api/client.ts` end up storing a JWT pair (`hub_access_token`, `hub_refresh_token`) in localStorage:

- **Direct login** (`login()`): POST to `/api/token/` with username/password — used by `app/login/page.tsx`.
- **SSO bounce** (`buildSsoUrl()` → `exchangeCode()`): user clicks "Continue with Crush.lu", browser is sent to `${API}/api/auth/spa-callback/?return=${origin}/auth/callback`. Django (after a Crush.lu allauth login if needed) 302s back to `/auth/callback?code=...`. The callback page POSTs that code to `/api/token/exchange-code/` and scrubs the code from URL history. The return URL must be exactly listed in Django's `SPA_CALLBACK_ALLOWED_RETURN_URLS` — for prod that's `https://hub.crush.lu/auth/callback`, for dev `http://localhost:3000/auth/callback`.

The `request<T>()` wrapper attaches the bearer token, and on 401 it makes **one** refresh attempt against `/api/token/refresh/` before failing. If refresh fails it clears tokens — subsequent hub fetches will return `null` (unauthenticated) and the UI will show the "Sign in to load your portal data" banner instead of stale data.

### API host convention
The backend is reached at a dedicated origin (e.g. `https://api.crush.lu`), and hub routes are exposed as `/hub/*` directly on that host — **not** under `/api/hub/*`. JWT routes (`/api/token/*`, `/api/auth/spa-callback/`) keep the `/api/` prefix because they're DRF-standard. Don't conflate the two when adding endpoints.

### Path alias
`tsconfig.json` maps `@/*` to `frontend/*`. Always import as `@/lib/...`, `@/components/...`, never as relative `../../`.

## CI / deploy notes

- `auto-merge-reapers013.yml` auto-approves and squash-merges PRs from user `REAPERS013`. The author check is intentionally at **step level**, not job level: `pull_request_target` fires on syncs of any open PR (including downstream forks tracking main), and a job-level filter would mark the workflow as failed (red X on main) instead of skipped. Don't move the guard.
  The approve step is `continue-on-error: true` on purpose: GitHub blocks `GITHUB_TOKEN` from approving PRs unless
  Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests" is enabled, and that
  refusal used to abort the job before the squash-merge step ran. Note `pull_request_target` always executes the
  workflow file from the **base** branch, so edits to this file only take effect for PRs opened after they land on main.
- Static Web Apps workflow runs on `push` to main and on PR open/sync/reopen/close. PR builds get preview environments automatically.
