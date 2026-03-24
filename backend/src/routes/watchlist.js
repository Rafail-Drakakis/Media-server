import { Router } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT s.*, w.created_at AS added_at
    FROM watchlist w
    JOIN shows s ON w.show_id = s.id
    WHERE w.user_id = ?
    ORDER BY w.created_at DESC
  `).all(req.userId);

  res.json(rows.map(s => {
    let genres;
    try { genres = JSON.parse(s.genres); } catch { genres = []; }
    return { ...s, genres };
  }));
});

router.post('/', (req, res) => {
  const { showId } = req.body;
  if (!showId) return res.status(400).json({ error: 'showId required' });

  try {
    db.prepare('INSERT OR IGNORE INTO watchlist (user_id, show_id) VALUES (?, ?)')
      .run(req.userId, showId);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/:showId', (req, res) => {
  db.prepare('DELETE FROM watchlist WHERE user_id = ? AND show_id = ?')
    .run(req.userId, req.params.showId);
  res.json({ ok: true });
});

export default router;
