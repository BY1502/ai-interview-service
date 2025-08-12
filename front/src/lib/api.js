const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
export const api = {
  get: (p) => fetch(`${BASE}${p}`, { credentials: 'include' }),
  post: (p, body) =>
    fetch(`${BASE}${p}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body ?? {}),
    }),
};

export async function getMe() {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include', // 쿠키 기반 세션이면 필요
  });
  if (!res.ok) throw new Error('Failed to fetch user info');
  return res.json();
}
