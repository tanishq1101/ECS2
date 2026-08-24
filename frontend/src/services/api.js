/**
 * Single entry point for every network call in the app.
 *
 * Nothing else in the frontend should call fetch directly — keeping requests
 * here means auth headers, error shapes and the base URL only exist in one
 * place when the prototype backend is replaced by the real one.
 */

// Vite proxies /api to the Express server in development (see vite.config.js).
const BASE_URL = import.meta.env.VITE_API_URL || '';
const TOKEN_KEY = 'sfwa.token';
const USER_KEY = 'sfwa.user';

/**
 * Fired when the server rejects the stored token, so the app can end the
 * session in one place instead of every page handling 401 on its own.
 */
export const SESSION_EXPIRED_EVENT = 'sfwa:session-expired';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

/**
 * Last known profile for the stored token. Lets a reload restore the session
 * without waiting on the network, and keeps the user signed in when the server
 * is briefly unreachable — only a rejected token signs them out.
 */
export const cachedUser = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY));
    } catch {
      return null;
    }
  },
  set: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
};

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = tokenStore.get();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${BASE_URL}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Network-level failure (server down, offline) — the most common case in a
    // prototype, so give it a message a student can act on.
    throw new ApiError(
      'Could not reach the server. Check that the backend is running and try again.',
      0,
      'network_error'
    );
  }

  if (response.status === 204) return null;

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // The token was rejected: drop it and let AuthContext send the user to the
    // sign-in page, rather than leaving them inside a shell that cannot load.
    if (response.status === 401 && auth && token) {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }

    // A dev-proxy 5xx with no JSON body usually means the API process is down.
    const fallback =
      response.status >= 500
        ? 'Could not reach the server. Check that the backend is running and try again.'
        : 'Something went wrong. Please try again.';

    throw new ApiError(payload?.message || fallback, response.status, payload?.error);
  }

  return payload;
}

/* ---------------- Auth (shared) ---------------- */

export const authApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};

/* ---------------- Student portal ---------------- */

export const studentApi = {
  meals: () => request('/student/meals'),
  setIntent: (mealId, intent, date) =>
    request(`/student/meals/${mealId}/intent`, { method: 'POST', body: { intent, date } }),
  history: (days = 14) => request(`/student/history?days=${days}`),
  notifications: () => request('/student/notifications'),
  markNotification: (id, read = true) =>
    request(`/student/notifications/${id}/read`, { method: 'POST', body: { read } }),
  profile: () => request('/student/profile'),
  updatePreferences: (patch) =>
    request('/student/preferences', { method: 'PATCH', body: patch }),
};

/* ---------------- Mess staff portal ---------------- */

export const adminApi = {
  summary: () => request('/dashboard/summary'),
  mealsToday: () => request('/meals/today'),
  predictions: () => request('/predictions'),
  attendance: () => request('/attendance'),
  analytics: () => request('/analytics'),
};
