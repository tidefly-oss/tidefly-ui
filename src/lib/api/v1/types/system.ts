// Mirrors: backend/internal/api/v1/handlers/system/handler.go

export interface ContainerSummary {
	total: number;
	running: number;
	stopped: number;
	error: number;
}

export interface CountSummary {
	total: number;
}

export interface UsageSummary {
	used_mb: number;
	total_mb: number;
	percent: number;
}

export interface ResourceSummary {
	cpu_percent: number;
	memory: UsageSummary;
	disk: UsageSummary;
}

export interface OverviewResponse {
	containers: ContainerSummary;
	images: CountSummary;
	volumes: CountSummary;
	networks: CountSummary;
	resources: ResourceSummary;
}

export interface SystemInfo {
	runtime_type: string;
	version: string;
	docker_version: string;
	api_version: string;
	os: string;
	arch: string;
	architecture: string;
	total_memory: number;
	container_count: number;
	running_count: number;
	paused_count: number;
	stopped_count: number;
	cpu_percent: number;
	mem_used_mb: number;
	mem_total_mb: number;
	mem_percent: number;
	disk_used_mb: number;
	disk_total_mb: number;
	disk_percent: number;
	uptime_seconds: number;
	tidefly_version: string;
}

export interface HealthResponse {
	status: string;
	version: string;
}

export interface UsedPortEntry {
	port: number;
	container_id: string;
	container_name: string;
	protocol: string;
	host_ip?: string;
}

export interface UsedPortsResponse {
	ports: UsedPortEntry[];
}
