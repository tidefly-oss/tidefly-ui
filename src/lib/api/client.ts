// Access token lives ONLY in memory — never in localStorage or sessionStorage.
// Refresh token lives in HttpOnly cookie — JS cannot read it (XSS-safe).
// On 401, we auto-refresh via cookie and retry the original request.

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly status: number
	) {
		super(message);
		this.name = "ApiError";
	}
}

// ── In-memory token store ─────────────────────────────────────────────────────

let _accessToken: string | null = null;
let _refreshPromise: Promise<string | null> | null = null;

export const tokenStore = {
	get(): string | null {
		return _accessToken;
	},
	set(t: string): void {
		_accessToken = t;
	},
	clear(): void {
		_accessToken = null;
	},
};

// ── Refresh ───────────────────────────────────────────────────────────────────
// Singleton promise — prevents multiple parallel refresh calls.

async function refreshAccessToken(): Promise<string | null> {
	if (_refreshPromise) return _refreshPromise;

	_refreshPromise = (async () => {
		try {
			const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
				method: "POST",
				credentials: "include", // sends HttpOnly cookie automatically
			});

			if (!res.ok) {
				_accessToken = null;
				return null;
			}

			const data = await res.json();
			_accessToken = data.access_token;
			return _accessToken;
		} catch {
			_accessToken = null;
			return null;
		} finally {
			_refreshPromise = null;
		}
	})();

	return _refreshPromise;
}

// ── Core request ──────────────────────────────────────────────────────────────

type Fetch = typeof fetch;

async function request<T>(
	path: string,
	init: RequestInit = {},
	fetchFn: Fetch = fetch,
	_retry = true
): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(init.headers as Record<string, string>),
	};

	if (_accessToken) {
		headers.Authorization = `Bearer ${_accessToken}`;
	}

	const res = await fetchFn(`${API_BASE}${path}`, {
		...init,
		credentials: "include", // still needed for refresh cookie on /auth/* routes
		headers,
	});

	// Auto-refresh on 401 and retry once
	if (res.status === 401 && _retry) {
		const newToken = await refreshAccessToken();
		if (newToken) {
			return request<T>(path, init, fetchFn, false);
		}
		// Refresh failed — redirect to login
		_accessToken = null;
		window.location.href = "/login";
		throw new ApiError("Session expired", 401);
	}

	if (res.status === 204) return undefined as T;

	const body = await res.json().catch(() => ({}));

	if (!res.ok) {
		throw new ApiError(body.message ?? body.error ?? `HTTP ${res.status}`, res.status);
	}

	return body as T;
}

// ── Public API ────────────────────────────────────────────────────────────────

export const api = {
	get: <T>(path: string, fetchFn?: Fetch) => request<T>(path, {}, fetchFn),
	post: <T>(path: string, body?: unknown, fetchFn?: Fetch) =>
		request<T>(path, { method: "POST", body: JSON.stringify(body) }, fetchFn),
	put: <T>(path: string, body?: unknown, fetchFn?: Fetch) =>
		request<T>(path, { method: "PUT", body: JSON.stringify(body) }, fetchFn),
	patch: <T>(path: string, body?: unknown, fetchFn?: Fetch) =>
		request<T>(path, { method: "PATCH", body: JSON.stringify(body) }, fetchFn),
	delete: <T>(path: string, fetchFn?: Fetch) => request<T>(path, { method: "DELETE" }, fetchFn),
};
