import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import { config } from '../config.js';

function normalizeRel(value) {
  return String(value || '').replace(/\\/g, '/').trim();
}

const PREFIX = '/api/metadata-asset/';

/**
 * If `urlPath` is a metadata-asset URL, return the absolute filesystem path or null.
 */
export function resolveMetadataAssetFsPath(urlPath) {
  if (typeof urlPath !== 'string' || !urlPath.startsWith(PREFIX)) return null;
  const encoded = urlPath.slice(PREFIX.length);
  let rel;
  try {
    rel = normalizeRel(decodeURIComponent(encoded));
  } catch {
    return null;
  }
  if (!rel || !rel.includes('/metadata/')) return null;
  const segments = rel.split('/').filter(Boolean);
  if (segments.some(s => s === '..')) return null;

  const mediaRoot = path.resolve(config.mediaRoot);
  const abs = path.resolve(path.join(mediaRoot, ...segments));
  if (!abs.startsWith(mediaRoot + path.sep) && abs !== mediaRoot) return null;
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return null;
  return abs;
}

const router = Router();

router.use((req, res) => {
  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  let rel;
  try {
    rel = normalizeRel(decodeURIComponent((req.path || '').replace(/^\//, '')));
  } catch {
    res.status(400).end();
    return;
  }
  if (!rel || !rel.includes('/metadata/')) {
    res.status(400).end();
    return;
  }
  const segments = rel.split('/').filter(Boolean);
  if (segments.some(s => s === '..')) {
    res.status(400).end();
    return;
  }

  const mediaRoot = path.resolve(config.mediaRoot);
  const abs = path.resolve(path.join(mediaRoot, ...segments));
  if (!abs.startsWith(mediaRoot + path.sep) && abs !== mediaRoot) {
    res.status(403).end();
    return;
  }
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.status(404).end();
    return;
  }

  const type = mime.lookup(abs) || 'application/octet-stream';
  res.type(type);
  res.sendFile(abs, (err) => {
    if (err && !res.headersSent) res.status(500).end();
  });
});

export default router;
