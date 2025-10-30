const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('adminToken') || '';
}

export function fetchWithAuth(path, opts = {}) {
  const token = getToken();
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (token) headers.Authorization = 'Bearer ' + token;
  return fetch(`${API_BASE}${path}`, { ...opts, headers });
}

export { API_BASE };
export default { API_BASE, getToken, fetchWithAuth };