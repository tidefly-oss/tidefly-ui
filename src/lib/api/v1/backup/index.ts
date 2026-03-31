import { api } from "$lib/api";
import type { BackupConfig, BackupRecord } from "$lib/api/v1/types";

export const backupApi = {
	getConfig: (): Promise<BackupConfig> => api.get("/api/v1/backups/config"),

	saveConfig: (data: {
		endpoint: string;
		bucket: string;
		region?: string;
		access_key: string;
		secret_key: string;
		use_ssl: boolean;
		path_style: boolean;
		prefix?: string;
	}): Promise<{ ok: boolean }> => api.put("/api/v1/backups/config", data),

	testConnection: (): Promise<{ ok: boolean; message: string }> =>
		api.post("/api/v1/backups/config/test"),

	createPostgresBackup: (data: {
		project_id?: string;
		service_id?: string;
		db_name: string;
		db_host?: string;
		db_port?: string;
		db_user: string;
		db_password: string;
	}): Promise<BackupRecord> => api.post("/api/v1/backups/postgres", data),

	listBackups: (projectId?: string, serviceId?: string): Promise<BackupRecord[]> => {
		const params = new URLSearchParams();
		if (projectId) params.set("project_id", projectId);
		if (serviceId) params.set("service_id", serviceId);
		return api.get(`/api/v1/backups?${params}`);
	},

	getDownloadUrl: (id: number): Promise<{ url: string }> =>
		api.get(`/api/v1/backups/${id}/download`),

	restore: (
		id: number,
		data: {
			db_name: string;
			db_host?: string;
			db_port?: string;
			db_user: string;
			db_password: string;
		}
	): Promise<{ ok: boolean }> => api.post(`/api/v1/backups/${id}/restore`, data),
};
