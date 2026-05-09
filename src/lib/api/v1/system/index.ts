import { api } from "$lib/api";
import type { SystemSnapshot } from "$lib/api/v1/types";
import type {
	HealthResponse,
	OverviewResponse,
	SystemInfo,
	UsedPortsResponse,
	VersionInfo,
} from "$lib/api/v1/types/system.js";

export const systemApi = {
	health: (fetchFn?: typeof fetch) => api.get<HealthResponse>("/api/v1/system/health", fetchFn),
	info: (fetchFn?: typeof fetch) => api.get<SystemInfo>("/api/v1/system/info", fetchFn),
	overview: (fetchFn?: typeof fetch) =>
		api.get<OverviewResponse>("/api/v1/system/overview", fetchFn),
	usedPorts: (fetchFn?: typeof fetch) =>
		api.get<UsedPortsResponse>("/api/v1/system/ports", fetchFn),
	metrics: () => api.get<SystemSnapshot>("/api/v1/system/metrics"),
	version: () => api.get<VersionInfo>("/api/v1/system/version"),
	triggerUpdate: () => api.post<{ message: string; version: string }>("/api/v1/admin/system/update"),
};