const API_BASE = import.meta.env.VITE_API_URL ?? '';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

type Fetch = typeof fetch;

async function request<T>(path: string, init: RequestInit = {}, fetchFn: Fetch = fetch): Promise<T> {
  const res = await fetchFn(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body.message ?? body.error ?? `HTTP ${res.status}`, res.status);
  }

  return body as T;
}

export const api = {
  get:    <T>(path: string, fetchFn?: Fetch)                 => request<T>(path, {}, fetchFn),
  post:   <T>(path: string, body?: unknown, fetchFn?: Fetch) => request<T>(path, { method: 'POST',   body: JSON.stringify(body) }, fetchFn),
  put:    <T>(path: string, body?: unknown, fetchFn?: Fetch) => request<T>(path, { method: 'PUT',    body: JSON.stringify(body) }, fetchFn),
  patch:  <T>(path: string, body?: unknown, fetchFn?: Fetch) => request<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }, fetchFn),
  delete: <T>(path: string, fetchFn?: Fetch)                 => request<T>(path, { method: 'DELETE' }, fetchFn),
};