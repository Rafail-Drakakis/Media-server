import { Router } from 'express';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import { getThumbnailPath } from '../services/thumbnail.js';

const router = Router();

router.use(authenticate);

router.get('/:showId', (req, res) => {
  const showId = req.params.showId;
  const id = parseInt(showId, 10);
  if (Number.isNaN(id) || id <= 0) {
    return res.status(400).send('Invalid show id');
  }

  const thumbPath = getThumbnailPath(id);

  try {
    if (!fs.existsSync(thumbPath)) {
      return res.status(404).send('Thumbnail not found');
    }
    res.type('image/jpeg');
    res.sendFile(thumbPath);
  } catch (err) {
    res.status(500).send('Error serving thumbnail');
  }
});

export default router;
