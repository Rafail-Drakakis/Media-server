import { spawn } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

const THUMBNAIL_DIR = path.join(config.mediaRoot, '.thumbnails');
const FRAME_SECONDS = 1;

export function getThumbnailPath(showId) {
  return path.join(THUMBNAIL_DIR, `show_${showId}.jpg`);
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
 * Generate a thumbnail for a show from its first media file and return the API path, or null on failure.
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
  const ok = await extractFrameFromVideo(videoPath, outputPath);
  return ok ? `/api/thumbnail/${showId}` : null;
}
