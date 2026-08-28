// ─── NAVIGO backend URLs — single source of truth ─────────────────────────
// VITE_API_URL may be set with or without a trailing '/api'.
// Both forms are normalized here so REST calls and socket.io connections
// always resolve against the correct origin.
//
//   VITE_API_URL=https://api.navigo.ug/api  →  API_URL:    .../api
//                                              SOCKET_URL: https://api.navigo.ug
//   VITE_API_URL=https://api.navigo.ug      →  (same result)

const raw = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

/** Backend origin WITHOUT '/api' — e.g. `http://localhost:5000`. Used for root-level routes such as OAuth (`/auth/google`). */
export const BACKEND_ORIGIN = raw.endsWith('/api') ? raw.slice(0, -4) : raw;

/** REST API base, always ending with '/api' — e.g. `http://localhost:5000/api`. */
export const API_URL = `${BACKEND_ORIGIN}/api`;

/** socket.io origin (no '/api' suffix) — e.g. `http://localhost:5000`. */
export const SOCKET_URL = BACKEND_ORIGIN;
