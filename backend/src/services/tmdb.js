import { config } from '../config.js';

const BASE = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';

async function tmdbGet(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  url.searchParams.set('api_key', config.tmdbApiKey);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString());
  if (!res.ok) return null;
  return res.json();
}

export async function searchMovie(title, year) {
  const params = { query: title };
  if (year) params.year = year;
  const data = await tmdbGet('/search/movie', params);
  if (!data || !data.results || data.results.length === 0) return null;
  return data.results[0];
}

export async function searchTV(title, year) {
  const params = { query: title };
  if (year) params.first_air_date_year = year;
  const data = await tmdbGet('/search/tv', params);
  if (!data || !data.results || data.results.length === 0) return null;
  return data.results[0];
}

export async function getMovieDetails(tmdbId) {
  return tmdbGet(`/movie/${tmdbId}`);
}

export async function getTVDetails(tmdbId) {
  return tmdbGet(`/tv/${tmdbId}`);
}

export function posterUrl(posterPath, size = 'w500') {
  if (!posterPath) return '';
  return `${IMG_BASE}/${size}${posterPath}`;
}

export function backdropUrl(backdropPath, size = 'w1280') {
  if (!backdropPath) return '';
  return `${IMG_BASE}/${size}${backdropPath}`;
}
