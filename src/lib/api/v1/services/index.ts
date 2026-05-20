import { api } from "$lib/api";
import type {
	Service,
	ServiceCreateRequest,
	ServiceUpdateRequest,
} from "$lib/api/v1/types/services.js";

export const servicesApi = {
	list: (fetchFn?: typeof fetch) => api.get<Service[]>("/api/v1/services", fetchFn),

	get: (id: string, fetchFn?: typeof fetch) => api.get<Service>(`/api/v1/services/${id}`, fetchFn),

	create: (body: ServiceCreateRequest, fetchFn?: typeof fetch) =>
		api.post<{ service: Service; url?: string }>("/api/v1/services", body, fetchFn),

	// Template deploy — backend resolves manifest + generates credentials
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
			"/api/v1/services/from-template",
			body,
			fetchFn
		),

	update: (id: string, body: ServiceUpdateRequest, fetchFn?: typeof fetch) =>
		api.patch<Service>(`/api/v1/services/${id}`, body, fetchFn),

	delete: (id: string, fetchFn?: typeof fetch) =>
		api.delete<void>(`/api/v1/services/${id}`, fetchFn),

	redeploy: (id: string, image?: string, fetchFn?: typeof fetch) =>
		api.post<{ service: Service }>(`/api/v1/services/${id}/redeploy`, { image }, fetchFn),
};
