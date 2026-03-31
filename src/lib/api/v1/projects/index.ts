import { api } from "$lib/api";
import type { Container } from "$lib/api/v1/types/containers.js";
import type {
	CreateProjectRequest,
	Project,
	UpdateProjectRequest,
} from "$lib/api/v1/types/projects.js";

export const projectsApi = {
	list: (fetchFn?: typeof fetch) => api.get<Project[]>("/api/v1/projects", fetchFn),
	get: (id: string, fetchFn?: typeof fetch) => api.get<Project>(`/api/v1/projects/${id}`, fetchFn),
	create: (body: CreateProjectRequest) => api.post<Project>("/api/v1/projects", body),
	update: (id: string, body: UpdateProjectRequest) =>
		api.put<Project>(`/api/v1/projects/${id}`, body),
	delete: (id: string) => api.delete<void>(`/api/v1/projects/${id}`),
	listContainers: (id: string, fetchFn?: typeof fetch) =>
		api.get<Container[]>(`/api/v1/projects/${id}/containers`, fetchFn),
};
