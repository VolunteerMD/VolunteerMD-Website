import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

function toBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stripTrailingSlash(value) {
  if (typeof value !== 'string') return value;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

const projectRoot = path.resolve(__dirname, '..');

const config = {
  environment: process.env.NODE_ENV || 'development',
  port: toNumber(process.env.PORT, 3000),
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(projectRoot, 'data', 'volunteermd.sqlite'),
  jwtSecret: process.env.JWT_SECRET || 'change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecure: toBoolean(process.env.COOKIE_SECURE, false),
  opportunityCacheTtlMinutes: toNumber(process.env.OPPORTUNITY_CACHE_TTL_MINUTES, 30),
  opportunitySource: (process.env.OPPORTUNITY_SOURCE || 'remote').toLowerCase(),
  opportunitySamplePath: process.env.OPPORTUNITY_SAMPLE_PATH
    ? path.resolve(process.cwd(), process.env.OPPORTUNITY_SAMPLE_PATH)
    : path.resolve(projectRoot, 'data', 'sample-opportunities.csv'),
  analyticsProvider: (process.env.ANALYTICS_PROVIDER || '').trim().toLowerCase(),
  plausibleDomain: process.env.PLAUSIBLE_DOMAIN ? process.env.PLAUSIBLE_DOMAIN.trim() : '',
  plausibleScriptHost: process.env.PLAUSIBLE_SCRIPT_HOST
    ? stripTrailingSlash(process.env.PLAUSIBLE_SCRIPT_HOST.trim())
    : 'https://plausible.io',
  cloudflareToken: process.env.CLOUDFLARE_BEACON_TOKEN ? process.env.CLOUDFLARE_BEACON_TOKEN.trim() : '',
  enableCompression: toBoolean(
    process.env.ENABLE_COMPRESSION,
    (process.env.NODE_ENV || 'development').toLowerCase() === 'production'
  ),
  staticCacheSeconds: toNumber(process.env.STATIC_CACHE_MAX_AGE_SECONDS, 60 * 60 * 24),
  spreadsheetsConfigPath: path.resolve(projectRoot, 'config', 'spreadsheets.json')
};

config.staticCacheSeconds = Math.max(0, config.staticCacheSeconds || 0);
config.staticCacheMs = config.staticCacheSeconds * 1000;

export default config;
