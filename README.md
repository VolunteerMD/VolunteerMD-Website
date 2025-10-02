# VolunteerMD Platform

VolunteerMD connects aspiring medical trainees with patient-oriented volunteering opportunities. This repository now contains a production-ready full-stack application with a modern frontend, secure authentication, and API integrations for pulling opportunities from curated Google Sheets.

## Highlights

- **Dynamic opportunity catalogue** powered by multiple Google Sheets (CSV exports) with search, subject/location/time filters, and prerequisite tags.
- **Secure user accounts** with hashed credentials, HTTP-only session cookies, and favourites synced across devices.
- **Saved opportunities dashboard** to review and unsave bookmarked roles.
- **Validated contact form** that stores incoming messages server-side for follow-up.
- **Automated data hygiene**: CSV rows are validated, deduplicated, cached, and safely rendered.
- **Tested flows**: vitest + supertest suite covering auth edge cases and the full signup → login → save → logout journey.

## Tech Stack

- **Backend**: Node.js 18+, Express 5, SQLite (via `better-sqlite3`), JWT cookies, bcrypt password hashing.
- **Frontend**: Vanilla ES modules served from `/public`, responsive styling with Montserrat typography.
- **Data ingestion**: `papaparse` for CSV parsing, configurable spreadsheet list in `config/spreadsheets.json`.
- **Testing**: Vitest + Supertest integration and E2E coverage.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   - Copy `.env.example` to `.env` and adjust as needed.
   - Minimum variables:
     - `DATABASE_PATH` – location for the SQLite database file (default `./data/volunteermd.sqlite`).
     - `JWT_SECRET` – strong secret for signing session cookies.
     - `OPPORTUNITY_SOURCE` – `remote` (default) to pull from Google Sheets or `sample` to use bundled CSV data.

3. **Run the development server**
   ```bash
   npm run dev
   ```
   The server listens on `http://localhost:3000` by default and serves the SPA with API routes under `/api/*`.

4. **Execute the test suite**
   ```bash
   npm test
   ```
   Tests run against the bundled sample opportunities to avoid network flakiness.

## Project Structure

```
public/               -> SPA assets (HTML, CSS, JS)
src/                  -> Express application code
  lib/                -> Database + opportunity ingestion utilities
  middleware/         -> Auth helpers (JWT cookies)
  routes/             -> Modular API routes
config/spreadsheets.json -> List of published Google Sheet CSV endpoints
data/                 -> Sample CSV + default database location
``` 

## Opportunity Sources

`config/spreadsheets.json` defines the public CSV exports currently aggregated (Hospice Calgary, Covenant Health, Alberta Children’s Hospital, Alzheimer Society Calgary, and the master opportunities list). Add or disable entries by editing this file—no code changes required.

## Analytics & Insights

VolunteerMD ships with optional Plausible analytics integration to keep tracking lightweight and privacy-conscious.

**Choose a provider:**

- **Plausible (self-hosted or SaaS):**
  1. Set `ANALYTICS_PROVIDER=plausible` in your environment.
  2. Provide `PLAUSIBLE_DOMAIN` (e.g. `volunteermd.org`); if you self-host, also set `PLAUSIBLE_SCRIPT_HOST`.
  3. The SPA auto-loads the script and emits custom events (`Opportunity View`, `Opportunity Saved`, `Opportunity Removed`) plus SPA pageviews. Filter these within the Plausible dashboard to find popular listings.

- **Cloudflare Web Analytics (free, great for GitHub Pages):**
  1. Point your custom domain at Cloudflare (you can keep hosting static assets on GitHub Pages).
  2. Copy your analytics token and set `ANALYTICS_PROVIDER=cloudflare` with `CLOUDFLARE_BEACON_TOKEN=...`.
  3. The SPA injects Cloudflare’s beacon script automatically; no further configuration needed. Use the Cloudflare dashboard for visits, uniques, referral sources, and top paths.

See `docs/analytics-playbook.md` for step-by-step setup and how to create shareable dashboards regardless of provider.

## Deployment Notes

- The Express server statically serves the frontend and exposes APIs; deploy it to Render, Railway, Fly.io, etc. Use `npm run start` in production environments.
- Set environment variables on the host (see `.env.example`). Use production-grade values for `JWT_SECRET` and enable `COOKIE_SECURE=true` behind HTTPS.
- If you also want a GitHub Pages version of the frontend, build from `public/` and point it at the hosted API origin (update fetch URLs if served from another domain).
- Schedule a cache refresh or call `POST /api/opportunities/refresh` (authenticated) after updating spreadsheets to warm the server-side cache.

### CDN & Compression Checklist

- **HTTP compression:** Enabled automatically when `ENABLE_COMPRESSION=true` (default in production). Disable it if your CDN already applies Brotli/gzip at the edge.
- **Static caching:** Tune `STATIC_CACHE_MAX_AGE_SECONDS` (default 86,400 seconds) so the CDN can cache JS/CSS/assets aggressively. HTML responses remain `no-cache` to ensure fresh shell delivery.
- **Edge caching/CDN:** Proxy the app through Cloudflare, Fastly, or another CDN to globalise static assets. Step-by-step guidance lives in `docs/cdn-guidance.md`.

## Development Tips

- Sample opportunities live in `data/sample-opportunities.csv` for offline work and testing.
- `npm run dev` hot-reloads the backend via `nodemon`; refresh the browser to pick up frontend changes.
- The favourites API requires authentication. Unsigned users are redirected to the Account tab when they try to save.

## Contributing

1. Create a feature branch.
2. Add/adjust tests where behaviour changes.
3. Run `npm test` to ensure the suite passes.
4. Update documentation (`README.md`, `ARCHITECTURE.md`) when workflows or integrations change.

Questions? Reach us at volunteermd.org@gmail.com.
