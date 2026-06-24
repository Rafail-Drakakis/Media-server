const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export function authUrl(url) {
  if (!url || !url.startsWith('/api/')) return url;
  const token = getToken();
  if (!token) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}token=${encodeURIComponent(token)}`;
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    setToken(null);
    const publicPaths = ['/', '/register'];
    if (!publicPaths.includes(window.location.pathname)) {
      window.location.href = '/';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  delete: (path) => request(path, { method: 'DELETE' }),

  login: (login, password) => request('/auth/login', { method: 'POST', body: { login, password } }),
  register: (email, password, displayName, username) =>
    request('/auth/register', { method: 'POST', body: { email, password, displayName, username } }),
  me: () => request('/auth/me'),

  getLibrary: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/library${qs ? `?${qs}` : ''}`);
  },
  getMedia: (id) => request(`/library/media/${id}`),
  getShow: (id) => request(`/library/${id}`),
  searchLibrary: (q) => request(`/library/search?q=${encodeURIComponent(q)}`),
  getTypes: () => request('/library/types'),
  getGenres: () => request('/library/genres'),
  scanLibrary: () => request('/library/scan', { method: 'POST' }),

  getProgress: () => request('/progress'),
  updateProgress: (mediaId, positionSeconds, durationSeconds) =>
    request('/progress', { method: 'PUT', body: { mediaId, positionSeconds, durationSeconds } }),
  deleteProgress: (mediaId) => request(`/progress/${mediaId}`, { method: 'DELETE' }),

  getWatchlist: () => request('/watchlist'),
  addToWatchlist: (showId) => request('/watchlist', { method: 'POST', body: { showId } }),
  removeFromWatchlist: (showId) => request(`/watchlist/${showId}`, { method: 'DELETE' }),

  streamUrl: (mediaId) => authUrl(`/api/stream/${mediaId}`),

  getSubtitles: (mediaId) => request(`/stream/${mediaId}/subtitles`),
  subtitleUrl: (mediaId, index) =>
    authUrl(`${API_BASE}/stream/${mediaId}/subtitles/${index}?format=vtt`),
};
