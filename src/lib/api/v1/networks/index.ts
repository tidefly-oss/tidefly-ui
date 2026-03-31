import { api } from "$lib/api";
import type { Network } from "$lib/api/v1/types/networks.js";

export const networksApi = {
	list: (fetchFn?: typeof fetch) => api.get<Network[]>("/api/v1/networks", fetchFn),
	get: (id: string, fetchFn?: typeof fetch) => api.get<Network>(`/api/v1/networks/${id}`, fetchFn),
	containers: (id: string) =>
		api.get<{ id: string; name: string }[]>(
			`/api/v1/networks/${encodeURIComponent(id)}/containers`
		),
	delete: (id: string, fetchFn?: typeof fetch) =>
		api.delete<void>(`/api/v1/networks/${id}`, fetchFn),
};
