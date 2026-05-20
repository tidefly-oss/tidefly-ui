import { api } from "$lib/api";
import { tokenStore } from "$lib/api/client";
import type {
	Container,
	ContainerDetails,
	ContainerStatus,
	ResourceLimits,
} from "$lib/api/v1/types/containers.js";

function withToken(url: string): string {
	const token = tokenStore.get();
	return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export const containersApi = {
	// ── CRUD ──────────────────────────────────────────────────────────────────
	list: (all = false, fetchFn?: typeof fetch) =>
		api.get<Container[]>(`/api/v1/containers?all=${all}`, fetchFn),
	get: (id: string, fetchFn?: typeof fetch) =>
		api.get<ContainerDetails>(`/api/v1/containers/${id}`, fetchFn),
	start: (id: string) => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/start`),
	stop: (id: string) => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/stop`),
	restart: (id: string) =>
		api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/restart`),
	// ── Resources ─────────────────────────────────────────────────────────────
	getResources: (id: string) => api.get<ResourceLimits>(`/api/v1/containers/${id}/resources`),
	updateResources: (id: string, body: ResourceLimits) =>
		api.patch<{ message: string; restart_required: boolean; applied: string[] }>(
			`/api/v1/containers/${id}/resources`,
			body
		),
	// ── Streaming ─────────────────────────────────────────────────────────────
	logsUrl: (id: string) => withToken(`/api/v1/containers/${id}/logs`),
	statsUrl: (id: string) => withToken(`/api/v1/containers/${id}/stats`),
};
