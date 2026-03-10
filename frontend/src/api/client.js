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
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
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

  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password, displayName) =>
    request('/auth/register', { method: 'POST', body: { email, password, displayName } }),
  me: () => request('/auth/me'),

  getLibrary: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/library${qs ? `?${qs}` : ''}`);
  },
  getShow: (id) => request(`/library/${id}`),
  searchLibrary: (q) => request(`/library/search?q=${encodeURIComponent(q)}`),
  getGenres: () => request('/library/genres'),
  scanLibrary: () => request('/library/scan', { method: 'POST' }),

  getProgress: () => request('/progress'),
  updateProgress: (mediaId, positionSeconds, durationSeconds) =>
    request('/progress', { method: 'PUT', body: { mediaId, positionSeconds, durationSeconds } }),
  deleteProgress: (mediaId) => request(`/progress/${mediaId}`, { method: 'DELETE' }),

  getWatchlist: () => request('/watchlist'),
  addToWatchlist: (showId) => request('/watchlist', { method: 'POST', body: { showId } }),
  removeFromWatchlist: (showId) => request(`/watchlist/${showId}`, { method: 'DELETE' }),

  streamUrl: (mediaId) => `/api/stream/${mediaId}?token=${getToken()}`,

  launchInVLC: (mediaId, startTime = 0) =>
    request(`/launch/${mediaId}`, { method: 'POST', body: { startTime } }),
};
