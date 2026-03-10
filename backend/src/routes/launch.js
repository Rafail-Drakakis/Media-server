import { Router } from 'express';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import db from '../db/index.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/:id', (req, res) => {
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

  const startTime = Number(req.body.startTime) || 0;
  const args = [resolved];
  if (startTime > 0) {
    args.push('--start-time', String(Math.floor(startTime)));
  }

  try {
    const child = spawn('vlc', args, { detached: true, stdio: 'ignore' });
    child.unref();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to launch VLC', details: err.message });
  }
});

export default router;
