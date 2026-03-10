import { Router } from 'express';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import db from '../db/index.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const VLC_BASE_PORT = 9090;
const VLC_PASSWORD = 'vlcmedia';
const POLL_INTERVAL_MS = 5000;

const sessions = new Map();

const saveProgress = db.prepare(`
  INSERT INTO watch_progress (user_id, media_id, position_seconds, duration_seconds, updated_at)
  VALUES (?, ?, ?, ?, datetime('now'))
  ON CONFLICT(user_id, media_id) DO UPDATE SET
    position_seconds = excluded.position_seconds,
    duration_seconds = excluded.duration_seconds,
    updated_at = datetime('now')
`);

function getAvailablePort() {
  let port = VLC_BASE_PORT;
  while (sessions.has(port)) port++;
  return port;
}

function pollVlcStatus(port) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`:${VLC_PASSWORD}`).toString('base64');
    const req = http.get({
      hostname: '127.0.0.1',
      port,
      path: '/requests/status.json',
      headers: { 'Authorization': `Basic ${auth}` },
      timeout: 3000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function cleanupSession(port) {
  const session = sessions.get(port);
  if (!session) return;

  clearInterval(session.interval);

  if (session.lastPosition > 0) {
    try {
      saveProgress.run(session.userId, session.mediaId, session.lastPosition, session.lastDuration);
    } catch (err) {
      console.error('Failed to save final VLC progress:', err.message);
    }
  }

  sessions.delete(port);
  console.log(`VLC session ended for media ${session.mediaId} on port ${port}`);
}

function startPolling(port) {
  const session = sessions.get(port);
  if (!session) return;

  let consecutiveFailures = 0;

  session.interval = setInterval(async () => {
    try {
      const status = await pollVlcStatus(port);
      consecutiveFailures = 0;

      const position = status.time || 0;
      const duration = status.length || 0;

      session.lastPosition = position;
      session.lastDuration = duration;

      if (position > 0) {
        saveProgress.run(session.userId, session.mediaId, position, duration);
      }
    } catch {
      consecutiveFailures++;
      if (consecutiveFailures >= 3) {
        cleanupSession(port);
      }
    }
  }, POLL_INTERVAL_MS);
}

router.get('/active', (_req, res) => {
  const mediaIds = [...sessions.values()].map(s => s.mediaId);
  res.json(mediaIds);
});

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
  const port = getAvailablePort();

  const args = [
    resolved,
    '--extraintf', 'http',
    '--http-host', '127.0.0.1',
    '--http-port', String(port),
    '--http-password', VLC_PASSWORD,
  ];
  if (startTime > 0) {
    args.push('--start-time', String(Math.floor(startTime)));
  }

  try {
    const child = spawn('vlc', args, { detached: true, stdio: 'ignore' });
    child.unref();

    sessions.set(port, {
      mediaId: Number(req.params.id),
      userId: req.userId,
      interval: null,
      lastPosition: startTime,
      lastDuration: 0,
    });

    setTimeout(() => startPolling(port), 2000);

    child.on('close', () => cleanupSession(port));

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to launch VLC', details: err.message });
  }
});

export default router;
