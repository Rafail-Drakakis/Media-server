import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { initDb } from './db/index.js';

function purgeMediaTrash() {
  const trashDir = path.join(config.mediaRoot, '.Trash-1000');
  if (fs.existsSync(trashDir)) {
    fs.rmSync(trashDir, { recursive: true, force: true });
    console.log(`Removed ${trashDir}`);
  }
}

async function start() {
  purgeMediaTrash();
  await initDb();

  const { default: authRoutes } = await import('./routes/auth.js');
  const { default: libraryRoutes } = await import('./routes/library.js');
  const { default: progressRoutes } = await import('./routes/progress.js');
  const { default: watchlistRoutes } = await import('./routes/watchlist.js');
  const { default: streamRoutes } = await import('./routes/stream.js');
  const { default: thumbnailRoutes } = await import('./routes/thumbnail.js');
  const { default: metadataAssetRoutes } = await import('./routes/metadata-asset.js');

  const app = express();

  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  }));
  app.use(express.json());
  app.use('/api/metadata-asset', metadataAssetRoutes);

  app.use('/api/auth', authRoutes);
  app.use('/api/library', libraryRoutes);
  app.use('/api/progress', progressRoutes);
  app.use('/api/watchlist', watchlistRoutes);
  app.use('/api/stream', streamRoutes);
  app.use('/api/thumbnail', thumbnailRoutes);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.listen(config.port, () => {
    console.log(`Backend running on http://localhost:${config.port}`);
    console.log(`Media root: ${config.mediaRoot}`);
  });
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
