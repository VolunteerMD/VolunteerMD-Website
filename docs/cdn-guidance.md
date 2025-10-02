# CDN & Edge Caching Guidance

This document outlines a quick path to front VolunteerMD with a content-delivery network while keeping the backend API responsive.

## 1. Prerequisites
- Deploy the Express server (`npm run start`) to a public host (Render, Railway, Fly.io, AWS, etc.).
- Ensure `ENABLE_COMPRESSION=true` and `STATIC_CACHE_MAX_AGE_SECONDS` are configured in the server environment. Static assets now ship with immutable cache headers while HTML stays un-cached.

## 2. Recommended CDN Settings (example: Cloudflare)
1. Add your VolunteerMD domain (e.g. `volunteermd.org`) to the CDN and point DNS records to the backend host.
2. Create a caching rule:
   - Match: `*.js`, `*.css`, `*.png`, `*.svg`, `*.woff2`, `*.ico`
   - Action: Cache Everything
   - Edge TTL: 7 days (or align with your deployment cadence)
3. Add another rule for HTML (`*.html`) that respects origin headers (the server sends `Cache-Control: no-cache`).
4. Enable Brotli compression at the edge (kept if the CDN already handles it; origin compression remains as a fallback).
5. Turn on "Always Use HTTPS" and "HTTP/2" for better transport performance.

## 3. Cache Invalidation
- Because assets are aggressively cached, bust caches whenever you deploy by changing filenames (handled automatically if you add content hashes) or invoking the CDN’s purge API for `/public/*`.
- For nightly spreadsheet refreshes, consider hitting `/api/opportunities/refresh` after cache purge to warm the in-memory dataset.

## 4. Observability
- Monitor origin latency and cache HIT ratios in the CDN dashboard.
- Pair the CDN metrics with Plausible events (`Opportunity View`, `Opportunity Saved`) to understand how performance improvements affect engagement.

## 5. Troubleshooting
- Stale assets: Purge the CDN cache or shorten `STATIC_CACHE_MAX_AGE_SECONDS` temporarily.
- Mixed content warnings: ensure your CDN proxies HTTPS and redirect all HTTP traffic to HTTPS.
- API POST/DELETE requests should bypass caching automatically; if not, add a rule to never cache `/api/*`.

With these steps, the CDN handles static delivery while Express+SQLite focus on authenticated traffic and data orchestration.
