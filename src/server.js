import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import config from './config.js';
import { attachUser } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import opportunitiesRoutes from './routes/opportunities.js';
import favoritesRoutes from './routes/favorites.js';
import contactRoutes from './routes/contact.js';
import configRoutes from './routes/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(attachUser);

if (config.enableCompression) {
  app.use(compression());
}

const publicDir = path.resolve(__dirname, '..', 'public');
const staticOptions = {
  maxAge: config.staticCacheMs,
  etag: true,
  setHeaders(res, filePath) {
    if (config.staticCacheSeconds > 0) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', `public, max-age=${config.staticCacheSeconds}, immutable`);
      }
    }
  }
};
app.use(express.static(publicDir, staticOptions));

app.use('/api/auth', authRoutes);
app.use('/api/opportunities', opportunitiesRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/config', configRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  return res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

if (config.environment !== 'test') {
  app.listen(config.port, () => {
    console.log(`VolunteerMD server listening on port ${config.port}`);
  });
}

export default app;
