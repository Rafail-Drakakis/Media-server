import { Router } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT wp.*, mi.show_id, mi.file_path, mi.season_number, mi.episode_number, mi.episode_title,
           s.title AS show_title, s.poster_path, s.type AS show_type
    FROM watch_progress wp
    JOIN media_items mi ON wp.media_id = mi.id
    JOIN shows s ON mi.show_id = s.id
    WHERE wp.user_id = ?
    ORDER BY wp.updated_at DESC
  `).all(req.userId);
  res.json(rows);
});

const getMediaShow = db.prepare(`
  SELECT mi.show_id, s.type AS show_type
  FROM media_items mi
  JOIN shows s ON mi.show_id = s.id
  WHERE mi.id = ?
`);

const deleteOtherSeriesProgress = db.prepare(`
  DELETE FROM watch_progress
  WHERE user_id = ? AND media_id IN (
    SELECT id FROM media_items WHERE show_id = ? AND id != ?
  )
`);

router.put('/', (req, res) => {
  const { mediaId, positionSeconds, durationSeconds } = req.body;
  if (mediaId == null || positionSeconds == null) {
    return res.status(400).json({ error: 'mediaId and positionSeconds required' });
  }

  const row = getMediaShow.get(mediaId);
  if (row && row.show_type === 'series') {
    deleteOtherSeriesProgress.run(req.userId, row.show_id, mediaId);
  }

  db.prepare(`
    INSERT INTO watch_progress (user_id, media_id, position_seconds, duration_seconds, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, media_id) DO UPDATE SET
      position_seconds = excluded.position_seconds,
      duration_seconds = excluded.duration_seconds,
      updated_at = datetime('now')
  `).run(req.userId, mediaId, positionSeconds, durationSeconds || 0);

  res.json({ ok: true });
});

router.delete('/:mediaId', (req, res) => {
  db.prepare('DELETE FROM watch_progress WHERE user_id = ? AND media_id = ?')
    .run(req.userId, req.params.mediaId);
  res.json({ ok: true });
});

export default router;
