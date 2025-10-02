# Analytics Playbook

VolunteerMD supports either Plausible or Cloudflare Web Analytics. Pick the section that matches your deployment.

## Option A — Plausible Analytics

1. **Configure the production domain**
   - Log in to Plausible and add your production site (e.g. `volunteermd.org`).
   - Copy the exact domain into your environment variables:
     ```env
     ANALYTICS_PROVIDER=plausible
     PLAUSIBLE_DOMAIN=volunteermd.org
     # Optional if you self-host Plausible
     # PLAUSIBLE_SCRIPT_HOST=https://analytics.volunteermd.org
     ```
   - Deploy and confirm the SPA loads `plausible.js`.

## 2. Verify Event Streams
- Navigate through the site (Opportunities tab, open a link, save an opportunity) and confirm events appear under **Events** → `Opportunity View`, `Opportunity Saved`, `Opportunity Removed`.
- Plausible records SPA navigation as `pageview` events with hashes reflecting active tabs.

## 3. Create Saved Dashboards for Stakeholders
1. In Plausible, open the dashboard for your domain.
2. Apply filters for each view, then click **Save** → "Create shared link":
   - **Pageviews Overview:** default view, optionally filter by source/medium.
   - **Opportunity Views:** filter `Event name = Opportunity View`, add `props.title` dimension to surface top opportunities.
   - **Opportunity Saves:** filter `Event name = Opportunity Saved`, break down by `props.title` or `props.subject`.
3. Copy the shareable links and distribute them to stakeholders (links are read-only and auto-refresh).

## 4. Maintenance
- Rotate dashboards quarterly to ensure filters still match current campaigns.
- Audit for anomalies (sudden drop in `Opportunity View` events) which could signal spreadsheet or application issues.
- Combine Plausible exports with CRM/ATS data to measure conversion from view → save → application.

With these dashboards in place, stakeholders get live visibility into traffic, referrers, and opportunity engagement without requiring app access.

## Option B — Cloudflare Web Analytics

1. **Set up Cloudflare**
   - Add your VolunteerMD domain to Cloudflare and proxy DNS to the platform hosting your static assets (GitHub Pages works fine).
   - Enable the free Web Analytics feature and copy the beacon token.

2. **Configure the site**
   ```env
   ANALYTICS_PROVIDER=cloudflare
   CLOUDFLARE_BEACON_TOKEN=your-token-here
   ```
   - Deploy and verify the browser loads `https://static.cloudflareinsights.com/beacon.min.js` with your token.

3. **Share dashboards**
   - In the Cloudflare Analytics tab, create saved views for Pageviews, top URLs, and referrers.
   - Export or invite stakeholders with read-only access to the analytics property.

Cloudflare’s script respects privacy defaults, requires no cookies, and is a solid free option when you’re hosting the frontend on GitHub Pages.
