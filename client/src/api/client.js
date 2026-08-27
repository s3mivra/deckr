const BASE = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'deckr_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || res.statusText, data?.details);
  }
  return data;
}

export const Deckr = {
  me: () => api('/auth/me'),
  logout: () => api('/auth/logout', { method: 'POST' }),
  githubLoginUrl: () => `${BASE}/api/auth/github`,

  updateProfile: (patch) => api('/users/me', { method: 'PATCH', body: patch }),
  finishOnboarding: (body) => api('/users/me/onboarding', { method: 'POST', body }),
  setShowcase: (keys) => api('/users/me/showcase', { method: 'PUT', body: { keys } }),
  publicProfile: (username) => api(`/users/${encodeURIComponent(username)}`),

  listCards: () => api('/cards'),
  getCard: (id) => api(`/cards/${id}`),
  createCard: (body) => api('/cards', { method: 'POST', body }),
  updateCard: (id, body) => api(`/cards/${id}`, { method: 'PATCH', body }),
  deleteCard: (id) => api(`/cards/${id}`, { method: 'DELETE' }),
  syncCard: (id) => api(`/cards/${id}/sync`, { method: 'POST' }),
  toggleLike: (id) => api(`/cards/${id}/like`, { method: 'POST' }),
  prefill: (repo) => api(`/cards/prefill?repo=${encodeURIComponent(repo)}`),

  achievements: () => api('/achievements'),

  community: () => api('/community'),
};
