import { api } from '$lib/api';
import type {HealthResponse, OverviewResponse, SystemInfo, UsedPortsResponse} from "$lib/api/v1/types/system.js";

export const systemApi = {
  health:   (fetchFn?: typeof fetch) => api.get<HealthResponse>('/api/v1/system/health', fetchFn),
  info:     (fetchFn?: typeof fetch) => api.get<SystemInfo>('/api/v1/system/info', fetchFn),
  overview: (fetchFn?: typeof fetch) => api.get<OverviewResponse>('/api/v1/system/overview', fetchFn),
  usedPorts: (fetchFn?: typeof fetch) => api.get<UsedPortsResponse>('/api/v1/system/ports', fetchFn),
};