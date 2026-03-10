// API helper — resolves base URL for production vs dev
const API_BASE = import.meta.env.VITE_API_BASE || '';

export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const token = sessionStorage.getItem('heady_token');

  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const err = new Error(`API ${res.status}: ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
