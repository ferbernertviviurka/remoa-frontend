import type { Result } from '@remoa/contracts';
export async function api<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json');
  const tok = localStorage.getItem('g28p-token'); if (tok) headers.set('authorization', `Bearer ${tok}`);
  const response = await fetch(path, { ...init, headers });
  const body = await response.json();
  return response.ok ? body : { ok: false, error: body.error };
}
export const apiBase = () => location.origin;
export const sessionToken = async () => localStorage.getItem('g28p-token') ?? '';
