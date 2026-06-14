import type {
	Container,
	Image,
	Network,
	Notification,
	Project,
	SystemSettings,
	User,
	Volume,
} from "$lib/api/v1/types";

// Mirrors Go OverviewBody from internal/api/v1/handlers/dashboard/http/overview.go
export interface DashboardOverview {
	user: User;
	projects: Project[];
	notifications: Notification[];
	containers: Container[];
	images: Image[];
	networks: Network[];
	volumes: Volume[];
	settings?: SystemSettings; // only present for admin role
}
