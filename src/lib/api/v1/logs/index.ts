import { api } from '$lib/api';
import type {AppLog, AppLogsParams, AuditLog, AuditLogsParams, LogsResponse} from "$lib/api/v1/types/logs.js";

export const logsApi = {
	listApp: (params: AppLogsParams = {}) => {
		const q = new URLSearchParams();
		if (params.limit) q.set('limit', String(params.limit));
		if (params.offset) q.set('offset', String(params.offset));
		if (params.level) q.set('level', params.level);
		if (params.component) q.set('component', params.component);
		return api.get<LogsResponse<AppLog>>(`/api/v1/logs/app?${q}`);
	},

	listAudit: (params: AuditLogsParams = {}) => {
		const q = new URLSearchParams();
		if (params.limit) q.set('limit', String(params.limit));
		if (params.offset) q.set('offset', String(params.offset));
		if (params.user_id) q.set('user_id', params.user_id);
		if (params.action) q.set('action', params.action);
		if (params.success !== undefined) q.set('success', String(params.success));
		return api.get<LogsResponse<AuditLog>>(`/api/v1/logs/audit?${q}`);
	},

	appStreamUrl: () => `/api/v1/logs/app/stream`,
};