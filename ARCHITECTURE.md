# Architecture Overview

VolunteerMD is a lightweight full-stack application composed of a static frontend served by an Express backend. All stateful operations (authentication, favourites, contact submissions) live on the server, while the browser renders opportunities, handles filters, and makes authenticated API calls.

## Components

### Frontend (`public/`)
- **`index.html`**: Single-page layout with navigation tabs for Home, Opportunities, Saved, Account, About, and Contact.
- **`css/styles.css`**: Dark theme styling, responsive grid for opportunity cards, accessible focus states, and custom tag colours for prerequisites.
- **`js/app.js`**: ES module controlling navigation, filters, search debouncing, favourites toggling, account forms, and contact form submissions. All API calls are made with `fetch` sending credentials for cookie-based auth.

### Backend (`src/`)
- **Entry point**: `src/server.js` initialises Express, static file serving, JSON parsing, and middleware.
- **Middleware**: `middleware/auth.js` decodes JWT cookies, enforces authentication, and sets/clears session cookies.
- **Database**: `lib/db.js` configures SQLite (WAL, foreign keys) and ensures tables (`users`, `favorites`, `contact_messages`) exist.
- **Opportunity ingestion**: `lib/opportunityService.js` loads Google Sheet CSVs listed in `config/spreadsheets.json`, normalises rows, deduplicates records, applies caching, and exposes filtering helpers.
- **Routes**:
  - `routes/opportunities.js`: List/filter opportunities, fetch single opportunity, and authenticated cache refresh.
  - `routes/auth.js`: Register/login/logout endpoints with bcrypt hashing and JWT issuance.
  - `routes/favorites.js`: Auth-required endpoints for listing/adding/removing saved opportunities.
  - `routes/contact.js`: Validated contact submissions stored server-side.

## Data Flow

1. **Opportunities**
   - On initial load the frontend calls `GET /api/opportunities`.
   - The backend fetches and caches CSV data from Google Sheets (or local sample data when `OPPORTUNITY_SOURCE=sample`).
   - Cleaned opportunities are returned with computed IDs, requirements array, and source metadata.
   - Filters/search run client-side; cache refresh can be forced via `POST /api/opportunities/refresh` (auth required).

2. **Authentication & Sessions**
   - Registration hashes passwords with bcrypt (12 salt rounds) and returns a JWT stored in an HttpOnly cookie.
   - `attachUser` middleware decodes JWTs on each request; cookies are `SameSite=Lax` with optional `Secure` flag.
   - Frontend checks `/api/auth/me` on startup to hydrate the UI and calls `/api/auth/logout` to revoke sessions.

3. **Favourites**
   - Opportunity IDs are deterministic SHA-256 hashes derived from source + key fields so favourites stay stable across imports.
   - Saved opportunities persist in the `favorites` table keyed by user ID; the frontend syncs on login and toggles state client-side.
   - Attempting to save while signed out nudges the user to the Account tab.

4. **Contact Form**
   - `POST /api/contact` validates name/email/message, stores entries in `contact_messages`, and allows simple inbox processing later.

## Testing

- `tests/api.spec.js` uses Vitest + Supertest to cover:
  - Registration/login error handling (duplicate emails, wrong password).
  - Full signup → login → save opportunity → logout flow using an agent (cookie persistence).
- Tests run against `data/sample-opportunities.csv` to avoid network dependency. The test database is isolated via `DATABASE_PATH=./data/test.sqlite` provided in the npm scripts.

## Configuration & Deployment

- Environment is managed through `src/config.js` and `.env` variables (`PORT`, `DATABASE_PATH`, `JWT_SECRET`, `COOKIE_SECURE`, `OPPORTUNITY_SOURCE`, etc.).
- `config/spreadsheets.json` lists all Google Sheet CSV endpoints; update it to add/remove sources without code changes.
- For production enable TLS (set `COOKIE_SECURE=true`) and provide a strong `JWT_SECRET`.
- Deploy Express to a host (Render, Railway, Fly.io, etc.) and serve the SPA directly from the same process. If hosting the frontend separately, update `public/js/app.js` fetch base URLs to point at the deployed API.
