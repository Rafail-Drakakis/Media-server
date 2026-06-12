import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import db from '../db/index.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const SUB_EXTENSIONS = new Set(['.srt', '.vtt']);

function collectSubtitleDirs(videoAbsPath) {
  const mediaRoot = path.resolve(config.mediaRoot);
  const mediaRootPrefix = mediaRoot + path.sep;
  const dirs = [];
  const seen = new Set();
  let dir = path.dirname(path.resolve(videoAbsPath));

  while (dir === mediaRoot || dir.startsWith(mediaRootPrefix)) {
    if (!seen.has(dir)) {
      seen.add(dir);
      dirs.push(dir);
    }
    const meta = path.join(dir, 'metadata');
    if (fs.existsSync(meta) && fs.statSync(meta).isDirectory() && !seen.has(meta)) {
      seen.add(meta);
      dirs.push(meta);
    }
    if (dir === mediaRoot) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dirs;
}

function getMediaAndPath(mediaId) {
  const media = db.prepare('SELECT * FROM media_items WHERE id = ?').get(mediaId);
  if (!media) return null;
  const fullPath = path.join(config.mediaRoot, media.file_path);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(config.mediaRoot) || !fs.existsSync(resolved)) return null;
  return { media, fullPath: resolved, dir: path.dirname(resolved), base: path.basename(resolved, path.extname(resolved)) };
}

function listSubtitlesForMedia(mediaId) {
  const info = getMediaAndPath(mediaId);
  if (!info) return [];

  const mediaRoot = path.resolve(config.mediaRoot);
  const mediaRootPrefix = mediaRoot + path.sep;
  const byPath = new Set();
  const byBasename = new Set();
  const subs = [];

  for (const dir of collectSubtitleDirs(info.fullPath)) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name).toLowerCase();
      if (!SUB_EXTENSIONS.has(ext)) continue;
      const subPath = path.join(dir, entry.name);
      const resolvedSub = path.resolve(subPath);
      if (resolvedSub !== mediaRoot && !resolvedSub.startsWith(mediaRootPrefix)) continue;
      if (byPath.has(resolvedSub) || byBasename.has(entry.name)) continue;
      byPath.add(resolvedSub);
      byBasename.add(entry.name);
      subs.push({ filename: entry.name, filePath: resolvedSub });
    }
  }

  subs.sort((a, b) => a.filename.localeCompare(b.filename));
  return subs.map((s, i) => ({ ...s, index: i }));
}

function srtToVtt(srtText) {
  const lines = srtText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const out = ['WEBVTT', ''];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^\d+$/.test(line.trim())) {
      i++;
      const timeLine = lines[i];
      if (timeLine && /^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}/.test(timeLine)) {
        out.push(timeLine.replace(/,(\d{3})/g, '.$1'));
        i++;
        const textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          textLines.push(lines[i]);
          i++;
        }
        out.push(...textLines, '');
      }
      i++;
    } else {
      i++;
    }
  }
  return out.join('\n');
}

router.get('/:id/subtitles', (req, res) => {
  const info = getMediaAndPath(req.params.id);
  if (!info) return res.status(404).json({ error: 'Media not found' });
  const list = listSubtitlesForMedia(req.params.id);
  res.json(list.map(({ index, filename }) => ({ index, label: filename })));
});

router.get('/:id/subtitles/:index', (req, res) => {
  const mediaId = req.params.id;
  const index = parseInt(req.params.index, 10);
  if (Number.isNaN(index) || index < 0) return res.status(400).json({ error: 'Invalid subtitle index' });
  const list = listSubtitlesForMedia(mediaId);
  const item = list.find(s => s.index === index);
  if (!item) return res.status(404).json({ error: 'Subtitle not found' });
  const isVtt = path.extname(item.filePath).toLowerCase() === '.vtt';
  const wantVtt = req.query.format === 'vtt';
  try {
    const raw = fs.readFileSync(item.filePath, 'utf8');
    const content = isVtt ? raw : (wantVtt ? srtToVtt(raw) : raw);
    const contentType = (isVtt || wantVtt) ? 'text/vtt' : 'text/plain; charset=utf-8';
    res.set('Content-Type', contentType);
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to read subtitle file' });
  }
});

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
