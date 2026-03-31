import { api } from "$lib/api";
import { tokenStore } from "$lib/api/client";
import type { AuthResponse, LoginPayload } from "$lib/api/v1/types";

export const authApi = {
	register: async (payload: { name: string; email: string; password: string }): Promise<void> => {
		const res = await fetch("/api/v1/auth/register", {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body.message ?? "Registration failed");
		}
		const data = await res.json();
		tokenStore.set(data.access_token);
	},

	login: async (payload: LoginPayload): Promise<void> => {
		const res = await fetch("/api/v1/auth/login", {
			method: "POST",
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body.message ?? "Login failed");
		}
		const data = await res.json();
		tokenStore.set(data.access_token);
	},

	logout: async (): Promise<void> => {
		await fetch("/api/v1/auth/logout", {
			method: "POST",
			credentials: "include",
		});
		tokenStore.clear();
	},

	me: () => api.get<AuthResponse>("/api/v1/auth/me"),
};
