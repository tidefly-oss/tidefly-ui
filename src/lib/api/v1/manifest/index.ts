import { api } from "$lib/api";
import type {
	Service,
	ServiceCreateRequest,
	ServiceUpdateRequest,
} from "$lib/api/v1/types/manifest.js";

export const servicesApi = {
	list: (fetchFn?: typeof fetch) => api.get<Service[]>("/api/v1/manifest", fetchFn),
	get: (id: string, fetchFn?: typeof fetch) => api.get<Service>(`/api/v1/manifest/${id}`, fetchFn),
	create: (body: ServiceCreateRequest, fetchFn?: typeof fetch) =>
		api.post<{ service: Service; url?: string }>("/api/v1/manifest", body, fetchFn),
	createFromTemplate: (
		body: {
			slug: string;
			version: string;
			fields: Record<string, string>;
			project_id: string;
			expose?: boolean;
			domain?: string;
		},
		fetchFn?: typeof fetch
	) =>
		api.post<{ service: Service; url?: string; credentials?: Record<string, string> }>(
			"/api/v1/manifest/from-template",
			body,
			fetchFn
		),
	update: (id: string, body: ServiceUpdateRequest, fetchFn?: typeof fetch) =>
		api.patch<Service>(`/api/v1/manifest/${id}`, body, fetchFn),
	delete: (id: string, fetchFn?: typeof fetch) =>
		api.delete<void>(`/api/v1/manifest/${id}`, fetchFn),
	redeploy: (id: string, image?: string, fetchFn?: typeof fetch) =>
		api.post<{ service: Service }>(`/api/v1/manifest/${id}/redeploy`, { image }, fetchFn),
};
