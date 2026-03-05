import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import db from '../db/index.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/:id', (req, res) => {
  const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Media not found' });

  const fullPath = path.join(config.mediaRoot, media.file_path);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(config.mediaRoot)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  const stat = fs.statSync(resolved);
  const fileSize = stat.size;
  const mimeType = mime.lookup(resolved) || 'video/mp4';
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': mimeType,
    });

    fs.createReadStream(resolved, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': mimeType,
    });
    fs.createReadStream(resolved).pipe(res);
  }
});

export default router;
