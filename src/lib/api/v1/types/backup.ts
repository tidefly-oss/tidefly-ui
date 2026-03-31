export interface BackupConfig {
	endpoint: string;
	bucket: string;
	region: string;
	use_ssl: boolean;
	path_style: boolean;
	prefix: string;
	configured: boolean;
}

export interface BackupRecord {
	id: number;
	project_id: string;
	service_id: string;
	type: string;
	s3_key: string;
	size_bytes: number;
	status: "completed" | "failed" | "running";
	error?: string;
	created_at: string;
}
