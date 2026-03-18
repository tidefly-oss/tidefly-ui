export interface AppLog {
	id: number;
	level: 'INFO' | 'WARN' | 'ERROR';
	message: string;
	component: string;
	error: string;
	created_at: string;
}

export interface AuditLog {
	id: number;
	action: string;
	user_id: string;
	user_email: string;
	ip_address: string;
	user_agent: string;
	resource_id: string;
	details: string;
	success: boolean;
	created_at: string;
}

export interface LogsResponse<T> {
	logs: T[];
	total: number;
	limit: number;
	offset: number;
}

export interface AppLogsParams {
	limit?: number;
	offset?: number;
	level?: string;
	component?: string;
}

export interface AuditLogsParams {
	limit?: number;
	offset?: number;
	user_id?: string;
	action?: string;
	success?: boolean;
}