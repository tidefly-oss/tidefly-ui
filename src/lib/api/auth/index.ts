import { api } from '$lib/api';
import type {AuthResponse, LoginPayload} from "$lib/api/v1/types";


export const authApi = {
	login: async (payload: LoginPayload): Promise<void> => {
		const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			credentials: 'include',
		});
		if (!res.ok) throw new Error('Login fehlgeschlagen');
	},
	logout: ()                      		 => api.post<void>('/auth/logout'),
	me: () 						 => api.get<AuthResponse>('/api/v1/auth/me')
};