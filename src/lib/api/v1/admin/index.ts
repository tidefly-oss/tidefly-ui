import { api } from "$lib/api";
import type {
	AdminUser,
	CreateUserRequest,
	ResetPasswordResponse,
	SystemSettings,
	UpdateSettingsRequest,
	UpdateUserRequest,
} from "../types";

export const adminApi = {
	// ── Users ──────────────────────────────────────────────────────────────

	listUsers: () => api.get<{ users: AdminUser[] }>("/api/v1/admin/users"),

	getUser: (id: string) => api.get<{ user: AdminUser }>(`/api/v1/admin/users/${id}`),

	createUser: (body: CreateUserRequest) =>
		api.post<{ user: AdminUser; temp_password: string }>("/api/v1/admin/users", body),

	updateUser: (id: string, body: UpdateUserRequest) =>
		api.patch<{ user: AdminUser }>(`/api/v1/admin/users/${id}`, body),

	resetUserPassword: (id: string) =>
		api.post<ResetPasswordResponse>(`/api/v1/admin/users/${id}/reset-password`, {}),

	deleteUser: (id: string) => api.delete<void>(`/api/v1/admin/users/${id}`),

	// ── Settings ───────────────────────────────────────────────────────────

	getSettings: () => api.get<SystemSettings>("/api/v1/admin/settings"),

	updateSettings: (body: UpdateSettingsRequest) =>
		api.patch<SystemSettings>("/api/v1/admin/settings", body),

	setUserProjects: (id: string, projectIds: string[]) =>
		api.put<AdminUser>(`/api/v1/admin/users/${id}/projects`, { project_ids: projectIds }),

	testNotification: (channel: string) =>
		api.post<void>(`/api/v1/admin/settings/test/${channel}`, {}),
};
