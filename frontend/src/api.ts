const configuredApiBase = import.meta.env.VITE_API_URL?.trim() || '';

// Remove trailing slashes so callers always produce a single /api path segment.
export const API_BASE = configuredApiBase.replace(/\/+$/, '');

// Authentication is cookie-based, so every cross-origin API call must include cookies.
export const apiFetch: typeof fetch = (input, init = {}) =>
  fetch(input, { credentials: 'include', ...init });
