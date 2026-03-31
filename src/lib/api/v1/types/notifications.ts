export type NotificationSeverity = "FATAL" | "ERROR" | "WARN";

export interface Notification {
	id: string;
	container_id: string;
	container_name: string;
	severity: NotificationSeverity;
	message: string;
	occurrence_count: number;
	acknowledged_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface NotificationCount {
	count: number;
}
