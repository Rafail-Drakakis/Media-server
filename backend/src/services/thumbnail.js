import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const THUMBNAIL_DIR = path.join(config.mediaRoot, 'thumbnails');
const FRAME_SECONDS = 1;

// Supported image extensions for local artwork search
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function getThumbnailPath(showId) {
  return path.join(THUMBNAIL_DIR, `show_${showId}.jpg`);
}

/**
 * Try to find a suitable image file in the same folder as a video file.
 * This is used as a smarter fallback before generating a thumbnail from video.
 *
 * Preference order:
 *  - Files whose base name starts with "episode <n>" (e.g. "episode 1.jpg")
 *  - Files whose name contains common artwork keywords: poster, cover, folder, thumb
 *  - Any other image file, alphabetically
 *
 * @param {string} firstVideoRelativePath - relative path from media root to one video file
 * @returns {string|null} Absolute path to chosen image file or null
 */
export function findLocalArtworkForVideo(firstVideoRelativePath) {
  const absVideoPath = path.join(config.mediaRoot, firstVideoRelativePath);
  let dir;
  try {
    dir = path.dirname(absVideoPath);
  } catch {
    return null;
  }

  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;

    const base = entry.name.replace(ext, '');
    const lower = base.toLowerCase();

    let score = 0;
    // Episode-specific artwork like "episode 1.jpg"
    if (/^episode\s+\d+/.test(lower)) {
      score = 3;
    } else if (/(poster|cover|folder|thumb)/.test(lower)) {
      score = 2;
    } else {
      score = 1;
    }

    candidates.push({
      name: entry.name,
      score,
    });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

  const best = candidates[0];
  return path.join(dir, best.name);
}

/**
 * Extract a single frame from a video file and save as JPEG.
 * @param {string} videoPath - Absolute path to the video file
 * @param {string} outputPath - Absolute path for the output JPEG
 * @returns {Promise<boolean>} - true if successful
 */
export function extractFrameFromVideo(videoPath, outputPath) {
  return new Promise((resolve) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const args = [
      '-y',
      '-ss', String(FRAME_SECONDS),
      '-i', videoPath,
      '-vframes', '1',
      '-q:v', '2',
      outputPath,
    ];

    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    proc.stderr?.on('data', (chunk) => { stderr += chunk; });
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        resolve(true);
      } else {
        if (code !== 0) {
          console.warn('ffmpeg thumbnail failed:', stderr.slice(-500));
        }
        resolve(false);
      }
    });
    proc.on('error', (err) => {
      console.warn('ffmpeg thumbnail error:', err.message);
      resolve(false);
    });
  });
}

/**
 * Generate a thumbnail for a show from either a local image file in the same
 * folder as the media, or from a video frame if no suitable image exists.
 *
 * @param {number} showId
 * @param {string} firstVideoRelativePath - relative path from media root to one video file
 * @returns {Promise<string|null>} - '/api/thumbnail/:showId' or null
 */
export async function generateShowThumbnail(showId, firstVideoRelativePath) {
  const videoPath = path.join(config.mediaRoot, firstVideoRelativePath);
  try {
    if (!fs.existsSync(videoPath)) return null;
  } catch {
    return null;
  }

  const outputPath = getThumbnailPath(showId);

  // First try to reuse existing artwork in the same folder (e.g. poster.jpg, episode 1.png)
  const artworkPath = findLocalArtworkForVideo(firstVideoRelativePath);
  if (artworkPath) {
    try {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.copyFileSync(artworkPath, outputPath);
      return `/api/thumbnail/${showId}`;
    } catch (err) {
      console.warn('Failed to copy local artwork for thumbnail:', err.message);
      // fall through to ffmpeg-based extraction
    }
  }

  const ok = await extractFrameFromVideo(videoPath, outputPath);
  return ok ? `/api/thumbnail/${showId}` : null;
}
