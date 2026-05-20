import type { EnvVar } from "$lib/api/v1/types/containers.js";

export type ServiceStatus = "deploying" | "running" | "stopped" | "failed";

export interface ServiceRuntimeState {
	status: string;
	replicas: number;
	cpu_percent: number;
	mem_percent: number;
	restart_count?: number;
}

export interface ServiceDriftState {
	has_drift: boolean;
	replica_drift?: boolean;
	not_running?: boolean;
}

export interface Service {
	id: string;
	name: string;
	status: ServiceStatus;
	manifest_service: boolean;
	manifest_json?: string;
	public_url?: string;
	last_error?: string;
	project_id?: string;
	worker_id?: string;
	created_at: string;
	updated_at: string;
	// Merged orchestration state — present on GET /services and GET /services/:id
	runtime?: ServiceRuntimeState;
	drift?: ServiceDriftState;
}

export interface ServiceCreateRequest {
	// Pre-resolved manifest JSON (template deploys)
	manifest_json?: string;

	// Source — one of:
	image?: string;
	compose?: string;
	dockerfile?: string;
	git_url?: string;

	// Identity
	name?: string;
	stack_name?: string;
	project_id?: string;

	// Networking
	domain?: string;
	port?: number;
	expose?: boolean;

	// Git
	branch?: string;
	git_integration_id?: string;

	// Runtime
	env?: EnvVar[];
	replicas?: number;
	strategy?: "rolling" | "recreate" | "blue-green";
}

export interface ServiceUpdateRequest {
	image?: string;
	env?: EnvVar[];
	replicas?: number;
	domain?: string;
}
