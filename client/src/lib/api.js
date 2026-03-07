// ================================================================
//  lib/api.js  —  Wrapper fetch autenticato
//
//  Uso:
//    import { apiGet, apiPost } from '@/lib/api';
//    const data = await apiGet('/teams/me');
//    const res  = await apiPost('/auth/login', { username, password });
// ================================================================

const BASE = '/api';

function getToken() {
  return localStorage.getItem('vb_token');
}

async function request(method, path, body = undefined) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 401 → token scaduto, forza reload per far scattare il redirect
  if (res.status === 401) {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_user');
    window.location.href = '/login';
    return;
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const err = new Error(data.error ?? `HTTP ${res.status}`);
    err.status = res.status;
    err.data   = data;
    throw err;
  }

  return data;
}

export const apiGet    = (path)         => request('GET',    path);
export const apiPost   = (path, body)   => request('POST',   path, body);
export const apiPut    = (path, body)   => request('PUT',    path, body);
export const apiPatch  = (path, body)   => request('PATCH',  path, body);
export const apiDelete = (path)         => request('DELETE', path);
