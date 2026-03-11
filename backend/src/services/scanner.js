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

const SXE_RE = /[Ss](\d{1,3})[Ee](\d{1,4})/;
const GREEK_EP_RE = /Επεισόδιο\s+(\d+)/;
const ENGLISH_EP_RE = /[Ee]pisode\s+(\d+)/;
const SEASON_FOLDER_RE = /^[Ss]eason\s*(\d+)$/;
const YEAR_RE = /[\(\[]?((?:19|20)\d{2})[\)\]]?/;
const NUMBERED_PREFIX_RE = /^(\d{1,3})\s*[-–.]\s*/;

const FOLDER_TYPE_MAP = {
  'movies': 'movie',
  'series': 'series',
  'concerts': 'concert',
  'documentaries': 'documentary',
  'podcasts': 'podcast',
  'talks': 'talk',
  'performances': 'performance',
  'stand up': 'standup',
};

const EPISODE_TYPES = new Set(['series', 'podcast', 'documentary']);

function cleanTitle(name) {
  return name
    .replace(/\.\w{2,4}$/, '')
    .replace(SXE_RE, '')
    .replace(GREEK_EP_RE, '')
    .replace(ENGLISH_EP_RE, '')
    .replace(YEAR_RE, '')
    .replace(/[\._\-\[\]()]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseFilePath(absPath) {
  const rel = path.relative(config.mediaRoot, absPath);
  const parts = rel.split(path.sep);
  const filename = parts[parts.length - 1];

  const topFolder = parts[0].toLowerCase();
  const contentType = FOLDER_TYPE_MAP[topFolder] || 'movie';

  const sxeMatch = filename.match(SXE_RE);
  const greekEpMatch = filename.match(GREEK_EP_RE);
  const engEpMatch = filename.match(ENGLISH_EP_RE);
  const numberedMatch = filename.match(NUMBERED_PREFIX_RE);

  const hasEpisodePattern = sxeMatch || greekEpMatch || engEpMatch || numberedMatch;
  const isInSubfolder = parts.length >= 3;
  const isEpisode = EPISODE_TYPES.has(contentType) || hasEpisodePattern;

  if (isEpisode && (hasEpisodePattern || isInSubfolder)) {
    let seasonNum = 1;
    let episodeNum = null;

    if (sxeMatch) {
      seasonNum = parseInt(sxeMatch[1], 10);
      episodeNum = parseInt(sxeMatch[2], 10);
    } else if (greekEpMatch) {
      episodeNum = parseInt(greekEpMatch[1], 10);
    } else if (engEpMatch) {
      episodeNum = parseInt(engEpMatch[1], 10);
    } else if (numberedMatch) {
      episodeNum = parseInt(numberedMatch[1], 10);
    }

    for (const p of parts) {
      const sm = p.match(SEASON_FOLDER_RE);
      if (sm) {
        seasonNum = parseInt(sm[1], 10);
        break;
      }
    }

    let showTitle = cleanTitle(filename);
    let year = null;
    for (let i = parts.length - 2; i >= 0; i--) {
      if (SEASON_FOLDER_RE.test(parts[i])) continue;
      if (FOLDER_TYPE_MAP[parts[i].toLowerCase()]) continue;
      showTitle = cleanTitle(parts[i]);
      const ym = parts[i].match(YEAR_RE);
      if (ym) year = ym[1];
      break;
    }

    return {
      type: contentType,
      title: showTitle,
      year,
      seasonNumber: seasonNum,
      episodeNumber: episodeNum,
      episodeTitle: cleanTitle(filename),
      relativePath: rel,
    };
  }

  const yearMatch = filename.match(YEAR_RE);
  const title = cleanTitle(filename);
  let year = yearMatch ? yearMatch[1] : null;

  if (!year && parts.length >= 2) {
    const folderYear = parts[parts.length - 2].match(YEAR_RE);
    if (folderYear) year = folderYear[1];
  }

  return {
    type: contentType,
    title,
    year,
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

const SKIP_TMDB_TYPES = new Set(['podcast', 'talk', 'concert', 'performance', 'standup']);

async function fetchShowMetadata(group) {
  if (SKIP_TMDB_TYPES.has(group.type)) {
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

  let tmdbResult, details;
  const useTV = group.type === 'series'
    || (group.type === 'documentary' && group.episodes.length > 1);

  try {
    if (useTV) {
      tmdbResult = await searchTV(group.title, group.year);
      if (tmdbResult) details = await getTVDetails(tmdbResult.id);
    }
    if (!details) {
      tmdbResult = await searchMovie(group.title, group.year);
      if (tmdbResult) details = await getMovieDetails(tmdbResult.id);
    }
  } catch (err) {
    console.warn(`TMDB lookup failed for "${group.title}":`, err.message);
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
  ON CONFLICT(tmdb_id, type) WHERE tmdb_id IS NOT NULL DO UPDATE SET
    title = excluded.title,
    overview = excluded.overview,
    poster_path = excluded.poster_path,
    backdrop_path = excluded.backdrop_path,
    release_date = excluded.release_date,
    vote_average = excluded.vote_average,
    genres = excluded.genres
`);

const insertMedia = db.prepare(`
  INSERT INTO media_items (show_id, file_path, season_number, episode_number, episode_title)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(file_path) DO UPDATE SET
    show_id = excluded.show_id,
    season_number = excluded.season_number,
    episode_number = excluded.episode_number,
    episode_title = excluded.episode_title
`);

const findShowByTmdb = db.prepare('SELECT id FROM shows WHERE tmdb_id = ? AND type = ?');
const findShowByTitle = db.prepare(`
  SELECT id FROM shows
  WHERE REPLACE(REPLACE(REPLACE(REPLACE(LOWER(title), '-', ' '), '.', ' '), '_', ' '), '  ', ' ')
      = REPLACE(REPLACE(REPLACE(REPLACE(LOWER(?), '-', ' '), '.', ' '), '_', ' '), '  ', ' ')
    AND type = ?
`);

const getAllMediaPaths = db.prepare('SELECT id, file_path FROM media_items');
const deleteMediaById = db.prepare('DELETE FROM media_items WHERE id = ?');
const getShowsWithNoMedia = db.prepare(`
  SELECT s.id FROM shows s
  LEFT JOIN media_items m ON s.id = m.show_id
  WHERE m.id IS NULL
`);
const deleteShowById = db.prepare('DELETE FROM shows WHERE id = ?');
const reassignMedia = db.prepare('UPDATE media_items SET show_id = ? WHERE show_id = ?');
const reassignWatchlist = db.prepare('UPDATE OR IGNORE watchlist SET show_id = ? WHERE show_id = ?');
const deleteWatchlistForShow = db.prepare('DELETE FROM watchlist WHERE show_id = ?');

function deduplicateShows() {
  const allShows = db.prepare('SELECT id, tmdb_id, type, title FROM shows ORDER BY id').all();
  const seen = new Map();
  let merged = 0;

  for (const show of allShows) {
    const normalizedTitle = show.title
      .toLowerCase()
      .replace(/[-._]/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    const tmdbKey = show.tmdb_id ? `tmdb::${show.tmdb_id}::${show.type}` : null;
    const titleKey = `title::${normalizedTitle}::${show.type}`;

    const keepId = (tmdbKey && seen.get(tmdbKey)) || seen.get(titleKey);

    if (keepId) {
      reassignMedia.run(keepId, show.id);
      reassignWatchlist.run(keepId, show.id);
      deleteWatchlistForShow.run(show.id);
      deleteShowById.run(show.id);
      merged++;
    } else {
      if (tmdbKey) seen.set(tmdbKey, show.id);
      seen.set(titleKey, show.id);
    }
  }

  if (merged > 0) {
    console.log(`Deduplicated ${merged} duplicate show(s)`);
  }
  return merged;
}

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

  deduplicateShows();

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
