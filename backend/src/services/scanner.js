import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import db from '../db/index.js';
import {
  searchMovie, searchTV,
  getMovieDetails, getTVDetails,
  posterUrl, backdropUrl,
} from './tmdb.js';

const VIDEO_EXTENSIONS = new Set([
  '.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v', '.wmv', '.flv', '.ts',
]);

function walkDir(dir) {
  const results = [];
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else if (VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      results.push(full);
    }
  }
  return results;
}

const EPISODE_RE = /[Ss](\d{1,3})[Ee](\d{1,4})/;
const YEAR_RE = /[\(\[]?((?:19|20)\d{2})[\)\]]?/;

function cleanTitle(name) {
  return name
    .replace(/\.\w{2,4}$/, '')
    .replace(EPISODE_RE, '')
    .replace(YEAR_RE, '')
    .replace(/[\._\-\[\]()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseFilePath(absPath) {
  const rel = path.relative(config.mediaRoot, absPath);
  const parts = rel.split(path.sep);
  const filename = parts[parts.length - 1];
  const epMatch = filename.match(EPISODE_RE);

  if (epMatch) {
    const seasonNum = parseInt(epMatch[1], 10);
    const episodeNum = parseInt(epMatch[2], 10);
    const showFolder = parts.length >= 2 ? parts[0] : filename;
    const yearMatch = showFolder.match(YEAR_RE);
    const title = cleanTitle(showFolder);
    return {
      type: 'series',
      title,
      year: yearMatch ? yearMatch[1] : null,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      episodeTitle: cleanTitle(filename),
      relativePath: rel,
    };
  }

  const yearMatch = filename.match(YEAR_RE);
  let title;
  if (parts.length >= 2) {
    title = cleanTitle(parts[parts.length - 2]);
    if (!yearMatch) {
      const folderYear = parts[parts.length - 2].match(YEAR_RE);
      if (folderYear) {
        return {
          type: 'movie',
          title: cleanTitle(parts[parts.length - 2]),
          year: folderYear[1],
          seasonNumber: null,
          episodeNumber: null,
          episodeTitle: '',
          relativePath: rel,
        };
      }
    }
  } else {
    title = cleanTitle(filename);
  }

  return {
    type: 'movie',
    title,
    year: yearMatch ? yearMatch[1] : null,
    seasonNumber: null,
    episodeNumber: null,
    episodeTitle: '',
    relativePath: rel,
  };
}

function groupByShow(parsed) {
  const groups = new Map();
  for (const p of parsed) {
    const key = `${p.type}::${p.title.toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, { type: p.type, title: p.title, year: p.year, episodes: [] });
    }
    groups.get(key).episodes.push(p);
  }
  return [...groups.values()];
}

async function fetchShowMetadata(group) {
  let tmdbResult, details;
  if (group.type === 'series') {
    tmdbResult = await searchTV(group.title, group.year);
    if (tmdbResult) details = await getTVDetails(tmdbResult.id);
  } else {
    tmdbResult = await searchMovie(group.title, group.year);
    if (tmdbResult) details = await getMovieDetails(tmdbResult.id);
  }

  if (!details) {
    return {
      tmdbId: null,
      title: group.title,
      overview: '',
      posterPath: '',
      backdropPath: '',
      releaseDate: '',
      voteAverage: 0,
      genres: '[]',
    };
  }

  const genres = (details.genres || []).map(g => g.name);
  return {
    tmdbId: details.id,
    title: details.title || details.name || group.title,
    overview: details.overview || '',
    posterPath: posterUrl(details.poster_path),
    backdropPath: backdropUrl(details.backdrop_path),
    releaseDate: details.release_date || details.first_air_date || '',
    voteAverage: details.vote_average || 0,
    genres: JSON.stringify(genres),
  };
}

const insertShow = db.prepare(`
  INSERT INTO shows (tmdb_id, type, title, overview, poster_path, backdrop_path, release_date, vote_average, genres)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertMedia = db.prepare(`
  INSERT OR IGNORE INTO media_items (show_id, file_path, season_number, episode_number, episode_title)
  VALUES (?, ?, ?, ?, ?)
`);

const findShowByTmdb = db.prepare('SELECT id FROM shows WHERE tmdb_id = ? AND type = ?');
const findShowByTitle = db.prepare('SELECT id FROM shows WHERE title = ? AND type = ?');

const getAllMediaPaths = db.prepare('SELECT id, file_path FROM media_items');
const deleteMediaById = db.prepare('DELETE FROM media_items WHERE id = ?');
const getShowsWithNoMedia = db.prepare(`
  SELECT s.id FROM shows s
  LEFT JOIN media_items m ON s.id = m.show_id
  WHERE m.id IS NULL
`);
const deleteShowById = db.prepare('DELETE FROM shows WHERE id = ?');

function removeUnreferencedMedia(validRelativePaths) {
  const allMedia = getAllMediaPaths.all();
  let removedMedia = 0;
  for (const row of allMedia) {
    if (!validRelativePaths.has(row.file_path)) {
      deleteMediaById.run(row.id);
      removedMedia++;
    }
  }

  const orphanShows = getShowsWithNoMedia.all();
  let removedShows = 0;
  for (const row of orphanShows) {
    deleteShowById.run(row.id);
    removedShows++;
  }

  return { removedMedia, removedShows };
}

export async function scanLibrary() {
  if (!fs.existsSync(config.mediaRoot)) {
    throw new Error(`MEDIA_ROOT does not exist: ${config.mediaRoot}`);
  }

  const files = walkDir(config.mediaRoot);
  const parsed = files.map(f => parseFilePath(f));
  const validRelativePaths = new Set(parsed.map(p => p.relativePath));
  const groups = groupByShow(parsed);
  let added = 0;

  for (const group of groups) {
    let showId;

    const meta = await fetchShowMetadata(group);

    if (meta.tmdbId) {
      const existing = findShowByTmdb.get(meta.tmdbId, group.type);
      if (existing) {
        showId = existing.id;
      }
    }

    if (!showId) {
      const existing = findShowByTitle.get(meta.title, group.type);
      if (existing) {
        showId = existing.id;
      }
    }

    if (!showId) {
      const result = insertShow.run(
        meta.tmdbId, group.type, meta.title, meta.overview,
        meta.posterPath, meta.backdropPath, meta.releaseDate,
        meta.voteAverage, meta.genres
      );
      showId = result.lastInsertRowid;
    }

    for (const ep of group.episodes) {
      const r = insertMedia.run(
        showId, ep.relativePath,
        ep.seasonNumber, ep.episodeNumber, ep.episodeTitle
      );
      if (r.changes > 0) added++;
    }
  }

  const { removedMedia, removedShows } = removeUnreferencedMedia(validRelativePaths);

  return {
    totalFiles: files.length,
    newItems: added,
    shows: groups.length,
    removedMedia,
    removedShows,
  };
}
