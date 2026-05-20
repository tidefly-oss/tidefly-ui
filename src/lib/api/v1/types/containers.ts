// Mirrors: internal/infrastructure/runtime/runtime.go

export type ContainerStatus =
	| "running"
	| "stopped"
	| "paused"
	| "exited"
	| "dead"
	| "restarting"
	| "created"
	| "unknown";

export interface Port {
	host_ip: string;
	host_port: number;
	container_port: number;
	protocol: string;
}

export interface Mount {
	source: string;
	destination: string;
	mode: string;
	rw: boolean;
}

export interface Container {
	id: string;
	name: string;
	image: string;
	status: ContainerStatus;
	state: string;
	created: string;
	ports: Port[];
	labels?: Record<string, string>;
	mounts?: Mount[];
	networks?: string[];
}

export interface ContainerDetails extends Container {
	command: string;
	entrypoint: string[];
	env: string[];
	mounts: Mount[];
	networks: string[];
	restart_policy: string;
}

export type DeployStrategy = "rolling" | "recreate" | "blue-green";
export type ScalingMetric = "cpu" | "memory" | "requests";

export interface AutoscalingConfig {
	enabled: boolean;
	min: number;
	max: number;
	metric: ScalingMetric;
	target: number;
}

export type ResourceLimits = {
	cpu_cores: number;
	memory_mb: number;
	memory_swap_mb: number;
	restart_policy: string;
	max_retries: number;
	replicas: number;
	deploy_strategy: DeployStrategy;
	autoscaling?: AutoscalingConfig;
};
export interface SystemSnapshot {
	cpu_percent: number;
	mem_used_mb: number;
	mem_total_mb: number;
	mem_percent: number;
	disk_used_mb: number;
	disk_total_mb: number;
	disk_percent: number;
	goroutines: number;
	uptime_seconds: number;
}

// EnvVar mirrors internal/domain/deploy/manifest/schema.go
export interface EnvVar {
	name: string;
	value?: string;
	secret?: string; // "secret-name/key" reference
}
