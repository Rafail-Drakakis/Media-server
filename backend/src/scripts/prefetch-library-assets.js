import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import db, { initDb } from '../db/index.js';
import { resolveMetadataAssetFsPath } from '../routes/metadata-asset.js';
import { scanLibrary } from '../services/scanner.js';
import { generateShowThumbnail, getThumbnailPath } from '../services/thumbnail.js';

const getShows = db.prepare(`
  SELECT id, title, poster_path, backdrop_path
  FROM shows
  ORDER BY id ASC
`);

const getFirstMediaForShow = db.prepare(`
  SELECT file_path
  FROM media_items
  WHERE show_id = ?
  ORDER BY season_number ASC, episode_number ASC, id ASC
  LIMIT 1
`);

const updateShowArtwork = db.prepare(`
  UPDATE shows
  SET poster_path = ?, backdrop_path = ?
  WHERE id = ?
`);

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value);
}

async function downloadToFile(url, outputPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, bytes);
}

async function prefetchArtworkForShow(show) {
  const localUrl = `/api/thumbnail/${show.id}`;
  const outputPath = getThumbnailPath(show.id);

  const remoteImage =
    (isHttpUrl(show.poster_path) && show.poster_path)
    || (isHttpUrl(show.backdrop_path) && show.backdrop_path)
    || null;

  if (remoteImage) {
    try {
      await downloadToFile(remoteImage, outputPath);
      updateShowArtwork.run(localUrl, localUrl, show.id);
      return { ok: true, source: 'remote', updated: true };
    } catch (err) {
      console.warn(`Artwork download failed for "${show.title}" (#${show.id}): ${err.message}`);
    }
  }

  const sidecarAsset =
    resolveMetadataAssetFsPath(show.poster_path)
    || resolveMetadataAssetFsPath(show.backdrop_path);
  if (sidecarAsset) {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(sidecarAsset, outputPath);
      updateShowArtwork.run(localUrl, localUrl, show.id);
      return { ok: true, source: 'metadata-asset', updated: true };
    } catch (err) {
      console.warn(`Sidecar artwork copy failed for "${show.title}" (#${show.id}): ${err.message}`);
    }
  }

  const firstMedia = getFirstMediaForShow.get(show.id);
  if (!firstMedia?.file_path) {
    return { ok: false, source: 'none', updated: false };
  }

  const generated = await generateShowThumbnail(show.id, firstMedia.file_path);
  if (!generated) {
    return { ok: false, source: 'ffmpeg', updated: false };
  }

  updateShowArtwork.run(localUrl, localUrl, show.id);
  return { ok: true, source: 'ffmpeg', updated: true };
}

async function run() {
  await initDb();

  console.log('Step 1/2: scanning library and refreshing metadata...');
  const scanResult = await scanLibrary();
  console.log('Scan done:', scanResult);

  console.log('Step 2/2: prefetching local artwork for all shows...');
  const shows = getShows.all();

  let ok = 0;
  let failed = 0;
  let remoteCount = 0;
  let ffmpegCount = 0;

  for (const show of shows) {
    const result = await prefetchArtworkForShow(show);
    if (result.ok) {
      ok++;
      if (result.source === 'remote') remoteCount++;
      if (result.source === 'ffmpeg') ffmpegCount++;
    } else {
      failed++;
    }
  }

  console.log('Done.');
  console.log(`Shows processed: ${shows.length}`);
  console.log(`Artwork cached: ${ok} (remote: ${remoteCount}, generated: ${ffmpegCount})`);
  console.log(`Failed: ${failed}`);
  console.log(`Local cache dir: ${path.join(config.mediaRoot, '.thumbnails')}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Prefetch script failed:', err);
    process.exit(1);
  });
