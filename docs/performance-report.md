# Performance, Load, and Scalability Assessment

_Date:_ 2025-10-02

## Frontend Audit
- **Bundle sizes:** `public/js/app.js` (~22 KB), `public/css/styles.css` (~10 KB), `public/index.html` (~7 KB). No heavy frameworks; all dependencies are native JS/CSS.
- **Critical path assets:** Google Fonts (Montserrat) is the only remote asset; consider self-hosting or adding `<link rel="preconnect">` hints for faster font delivery.
- **Script execution:** App logic is modular and event-driven; filtering/search operate on in-memory arrays and scale linearly with dataset size. With ~5,000 opportunities, the current rendering path (template cloning) remains performant in modern browsers; beyond that, consider windowing/virtualisation.
- **Caching:** Express serves static assets as-is. Enable HTTP caching headers or front the app with a CDN (Cloudflare, Fastly) to offload repeat requests and accelerate global delivery.
- **Compression:** Origin compression is now enabled when `ENABLE_COMPRESSION=true`; keep CDN-side Brotli active to maximise transfer savings.

## Backend Load Test
- **Scenario:** `GET /api/opportunities` with 40 concurrent clients for 15 seconds using sample data (`npx autocannon -d 15 -c 40 http://localhost:4000/api/opportunities`).
- **Results:** ~13.2k requests/sec average; p99 latency ~4 ms; max latency 72 ms (single outlier). 198k requests over 15 seconds; 18 MB/s throughput.
- **Observation:** CPU-bound work (CSV parsing) is cached after first request, so sustained load is limited primarily by JSON serialisation and network I/O. SQLite is not stressed in this read-only scenario.

## Scalability & Hosting
- The Node/Express stack comfortably handles >10k req/s on a single instance (based on load test). For production, deploy behind a process manager (PM2, systemd) or on a managed platform (Render, Railway, Fly.io) with autoscaling if traffic spikes.
- GitHub Pages alone cannot host the backend features (auth, favourites). Use GitHub Pages only for the static frontend and configure it to call the hosted API, or host both frontend and backend together on a Node platform.
- Persisted storage uses SQLite. For higher write concurrency (thousands of simultaneous favourites/contact submissions), consider migrating to PostgreSQL or running SQLite in WAL mode (already enabled) on fast SSD storage.

## Recommendations
1. **Static asset delivery:** Serve behind a CDN and add far-future cache headers for `/public` assets with cache-busting file names.
2. **Compression:** Origin `compression` middleware is active; ensure your CDN keeps Brotli/gzip enabled to avoid double-compressing.
3. **Monitoring:** Combine the new Plausible analytics with server-side metrics (p99 latency, error rates) via a lightweight APM (e.g., Better Stack, Logtail) for early warning on regressions.
4. **Load shedding:** Configure the opportunity cache TTL via `OPPORTUNITY_CACHE_TTL_MINUTES` to balance freshness and spreadsheet fetch frequency; keep the privileged `/api/opportunities/refresh` endpoint behind an authenticated admin UI to avoid abuse.
5. **Disaster recovery:** Schedule backups of the SQLite database (users, favourites, contacts) or store it on a managed volume with snapshots.

## Launch Readiness Summary
- ✅ **Functionality**: Auth, favourites, contact, and analytics instrumentation verified via automated tests.
- ✅ **Performance headroom**: Current implementation sustains ~13k req/s with sub-5 ms p99 latency under read-heavy load.
- ⚠️ **Scalability considerations**: SQLite suits MVP traffic; plan a migration path if daily active users exceed ~10k or favourites volume surges.
- 📈 **Analytics visibility**: Plausible custom events expose opportunity engagement; ensure dashboard filters are shared with stakeholders.
- 🚀 **Next steps**: Add CDN + compression, decide on hosting provider with health checks, and script regular cache warmers if spreadsheets refresh nightly.
