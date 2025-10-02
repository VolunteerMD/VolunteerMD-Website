import { Router } from 'express';
import config from '../config.js';

const router = Router();

router.get('/', (_req, res) => {
  const payload = {
    analytics: null
  };

  if (config.analyticsProvider === 'plausible' && config.plausibleDomain) {
    payload.analytics = {
      provider: 'plausible',
      domain: config.plausibleDomain,
      scriptHost: config.plausibleScriptHost || 'https://plausible.io'
    };
  } else if (config.analyticsProvider === 'cloudflare' && config.cloudflareToken) {
    payload.analytics = {
      provider: 'cloudflare',
      token: config.cloudflareToken
    };
  }

  res.json(payload);
});

export default router;
