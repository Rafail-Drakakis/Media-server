import { Router } from 'express';
import db from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { scanLibrary } from '../services/scanner.js';

const router = Router();
router.use(authenticate);

router.post('/scan', async (_req, res) => {
  try {
    const result = await scanLibrary();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const { type, genre, limit } = req.query;
  let sql = 'SELECT * FROM shows WHERE 1=1';
  const params = [];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }
  if (genre) {
    sql += ' AND genres LIKE ?';
    params.push(`%${genre}%`);
  }
  sql += ' ORDER BY created_at DESC';
  if (limit) {
    sql += ' LIMIT ?';
    params.push(parseInt(limit, 10));
  }

  const shows = db.prepare(sql).all(...params);
  res.json(shows.map(formatShow));
});

router.get('/types', (_req, res) => {
  const rows = db.prepare('SELECT DISTINCT type FROM shows ORDER BY type').all();
  res.json(rows.map(r => r.type));
});

router.get('/genres', (_req, res) => {
  const shows = db.prepare('SELECT genres FROM shows').all();
  const genreSet = new Set();
  for (const s of shows) {
    try {
      const arr = JSON.parse(s.genres);
      arr.forEach(g => genreSet.add(g));
    } catch { /* skip */ }
  }
  res.json([...genreSet].sort());
});

router.get('/search', (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);
  const shows = db.prepare(
    "SELECT * FROM shows WHERE title LIKE ? OR overview LIKE ? ORDER BY vote_average DESC LIMIT 50"
  ).all(`%${q}%`, `%${q}%`);
  res.json(shows.map(formatShow));
});

router.get('/media/:id', (req, res) => {
  const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(req.params.id);
  if (!media) return res.status(404).json({ error: 'Not found' });
  res.json(media);
});

router.get('/:id', (req, res) => {
  const show = db.prepare('SELECT * FROM shows WHERE id = ?').get(req.params.id);
  if (!show) return res.status(404).json({ error: 'Not found' });

  const episodes = db.prepare(
    'SELECT * FROM media_items WHERE show_id = ? ORDER BY season_number, episode_number'
  ).all(show.id);

  res.json({ ...formatShow(show), episodes });
});

function formatShow(s) {
  let genres;
  try { genres = JSON.parse(s.genres); } catch { genres = []; }
  return { ...s, genres };
}

export default router;
