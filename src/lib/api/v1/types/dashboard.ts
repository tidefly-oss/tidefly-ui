import type {
	Container,
	Image,
	Network,
	Notification,
	Project,
	SystemSettings,
	SystemInfo,
	User,
	Volume, VersionInfo,
} from "$lib/api/v1/types";

export interface SystemInfoSnapshot extends SystemInfo {
	tidefly_version: string;
}

export interface DashboardOverview {
	user: User;
	projects: Project[];
	notifications: Notification[];
	containers: Container[];
	images: Image[];
	networks: Network[];
	volumes: Volume[];
	settings?: SystemSettings;
	system_info?: SystemInfoSnapshot;
	version?: VersionInfo;
}