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
  cardSuggestions: () => api('/cards/suggestions'),
  exploreCards: ({ q = '', page = 1, sort = 'top' } = {}) =>
    api(`/cards/explore?q=${encodeURIComponent(q)}&page=${page}&sort=${sort}`),

  achievements: () => api('/achievements'),

  community: () => api('/community'),

  activity: () => api('/activity'),
  seenActivity: () => api('/activity/seen', { method: 'POST' }),

  myBaskets: () => api('/baskets'),
  pickableCards: () => api('/baskets/pickable'),
  createBasket: (body) => api('/baskets', { method: 'POST', body }),
  getBasket: (id) => api(`/baskets/${id}`),
  updateBasket: (id, body) => api(`/baskets/${id}`, { method: 'PATCH', body }),
  deleteBasket: (id) => api(`/baskets/${id}`, { method: 'DELETE' }),

  // published card-front designs (card builder picker + renderer)
  publishedDesigns: () => api('/designs'),
  getDesign: (slug) => api(`/designs/${encodeURIComponent(slug)}`),

  // admin deck builder
  listDesigns: () => api('/admin/designs'),
  getDesignAdmin: (slug) => api(`/admin/designs/${encodeURIComponent(slug)}`),
  createDesign: (body) => api('/admin/designs', { method: 'POST', body }),
  updateDesign: (slug, body) =>
    api(`/admin/designs/${encodeURIComponent(slug)}`, { method: 'PATCH', body }),
  duplicateDesign: (slug) =>
    api(`/admin/designs/${encodeURIComponent(slug)}/duplicate`, { method: 'POST' }),
  deleteDesign: (slug) =>
    api(`/admin/designs/${encodeURIComponent(slug)}`, { method: 'DELETE' }),
};
