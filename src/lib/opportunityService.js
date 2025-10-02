import fs from 'fs/promises';
import { createHash } from 'crypto';
import Papa from 'papaparse';
import config from '../config.js';

const minute = 60 * 1000;
let cache = { items: [], expiresAt: 0 };

async function loadSpreadsheetsConfig() {
  const raw = await fs.readFile(config.spreadsheetsConfigPath, 'utf8');
  return JSON.parse(raw);
}

function makeId(parts) {
  return createHash('sha256').update(parts.join('|').toLowerCase()).digest('hex').slice(0, 12);
}

function splitRequirements(value) {
  if (!value) return [];
  return value
    .split(/[;\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function coalesce(row, keys) {
  for (const key of keys) {
    if (!key) continue;
    const candidate = row[key];
    if (candidate !== undefined && candidate !== null && String(candidate).trim()) {
      return String(candidate).trim();
    }
  }
  return '';
}

function normalizeRow(row, source) {
  const lowered = {};
  for (const [key, value] of Object.entries(row)) {
    lowered[String(key).trim().toLowerCase()] = value;
  }

  const title = coalesce(lowered, ['title', 'opportunity', 'opportunity title', 'name']);
  const description = coalesce(lowered, ['description', 'desc', 'details']);
  const location = coalesce(lowered, ['location', 'city', 'city/region']);
  const timeCommitment = coalesce(lowered, ['time', 'time commitment', 'commitment', 'schedule']);
  const subject = coalesce(lowered, ['subject', 'category', 'focus area']);
  const link = coalesce(lowered, ['link', 'url', 'application link']);
  const organization = coalesce(lowered, ['organization', 'hospital', 'org', 'partner']);
  const orgLogo = coalesce(lowered, ['orglogourl', 'logo', 'image']);
  const requirements = splitRequirements(coalesce(lowered, ['requirements', 'req', 'requirements (semicolon-separated)']));

  if (!title || !link) {
    return null;
  }

  try {
    const u = new URL(link);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return null;
    }
  } catch (err) {
    return null;
  }

  const id = makeId([source.key, title, organization || '', location || '', link]);

  return {
    id,
    title,
    description,
    location,
    timeCommitment,
    subject,
    link,
    requirements,
    organization,
    orgLogo,
    sourceKey: source.key,
    sourceName: source.name
  };
}

async function parseCsv(text) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => String(header || '').trim()
  });
  if (parsed.errors && parsed.errors.length) {
    const sampleError = parsed.errors[0];
    console.warn('CSV parse warning:', sampleError.message, 'at row', sampleError.row);
  }
  return parsed.data || [];
}

async function fetchRemoteCsv(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load spreadsheet ${url}: ${response.status}`);
  }
  return response.text();
}

async function loadRawRows(source) {
  if (config.opportunitySource === 'sample' || config.opportunitySource === 'local') {
    const csv = await fs.readFile(config.opportunitySamplePath, 'utf8');
    return parseCsv(csv);
  }

  const csv = await fetchRemoteCsv(source.url);
  return parseCsv(csv);
}

async function fetchOpportunities(forceRefresh = false) {
  const now = Date.now();
  const ttl = Math.max(1, config.opportunityCacheTtlMinutes) * minute;

  if (!forceRefresh && cache.items.length > 0 && cache.expiresAt > now) {
    return cache.items;
  }

  const configEntries = await loadSpreadsheetsConfig();
  const results = [];
  const seen = new Map();

  if (config.opportunitySource === 'sample' || config.opportunitySource === 'local') {
    const sampleSource = { key: 'sample', name: 'Sample Data', url: config.opportunitySamplePath };
    const rows = await loadRawRows(sampleSource);
    for (const row of rows) {
      const normalized = normalizeRow(row, sampleSource);
      if (!normalized) continue;
      if (seen.has(normalized.id)) continue;
      seen.set(normalized.id, true);
      results.push(normalized);
    }
  } else {
    for (const source of configEntries) {
      try {
        const rows = await loadRawRows(source);
        for (const row of rows) {
          const normalized = normalizeRow(row, source);
          if (!normalized) continue;
          if (seen.has(normalized.id)) continue;
          seen.set(normalized.id, true);
          results.push(normalized);
        }
      } catch (err) {
        console.error(`Error loading ${source.name}:`, err.message);
      }
    }
  }

  cache = {
    items: results,
    expiresAt: Date.now() + ttl
  };
  return results;
}

export async function getOpportunities({ forceRefresh = false } = {}) {
  const items = await fetchOpportunities(forceRefresh);
  return items;
}

export async function getOpportunityById(id) {
  const items = await fetchOpportunities(false);
  return items.find((item) => item.id === id) || null;
}

export async function filterOpportunities(filters = {}) {
  const {
    location,
    subject,
    timeCommitment,
    search
  } = filters;

  const items = await fetchOpportunities(false);
  const normalizedSearch = search ? search.trim().toLowerCase() : '';

  return items.filter((item) => {
    if (location && item.location && item.location !== location) return false;
    if (location && !item.location && location) return false;
    if (subject && item.subject && item.subject !== subject) return false;
    if (subject && !item.subject && subject) return false;
    if (timeCommitment && item.timeCommitment && item.timeCommitment !== timeCommitment) return false;
    if (timeCommitment && !item.timeCommitment && timeCommitment) return false;

    if (normalizedSearch) {
      const haystack = [
        item.title,
        item.description,
        item.location,
        item.subject,
        item.timeCommitment,
        item.organization,
        (item.requirements || []).join(' ')
      ]
        .filter(Boolean)
        .join(' | ')
        .toLowerCase();
      if (!haystack.includes(normalizedSearch)) return false;
    }

    return true;
  });
}

export function clearCache() {
  cache = { items: [], expiresAt: 0 };
}
