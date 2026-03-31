import { api } from "$lib/api";
import { tokenStore } from "$lib/api/client";

function withToken(url: string): string {
	const token = tokenStore.get();
	return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export interface WorkerNode {
	id: string;
	name: string;
	description: string;
	status: "pending" | "connected" | "disconnected" | "revoked";
	last_seen_at: string | null;
	last_seen_ip: string | null;
	agent_version: string | null;
	os: string | null;
	arch: string | null;
	runtime_type: string | null;
	cpu_percent: number;
	mem_percent: number;
	container_count: number;
	registered_by_user_id: string;
	created_at: string;
}

export interface WorkerContainer {
	id: string;
	name: string;
	image: string;
	status: string;
	state: string;
	created: number;
	labels: Record<string, string>;
}

export interface RegistrationToken {
	id: number;
	token: string;
	label: string;
	expires_at: string;
	used: boolean;
	used_at: string | null;
	worker_id: string | null;
	created_by_user_id: string;
	created_at: string;
}

export interface CreateTokenRequest {
	label?: string;
}

export interface CreateTokenResponse {
	token: string;
	expires_at: string;
	label: string;
}

export const agentApi = {
	listWorkers: (): Promise<WorkerNode[]> => api.get("/api/v1/agent/workers"),

	listContainers: (workerId: string): Promise<WorkerContainer[]> =>
		api.get(`/api/v1/agent/workers/${workerId}/containers`),

	revokeWorker: (id: string): Promise<void> => api.delete(`/api/v1/agent/workers/${id}`),

	deleteWorker: (id: string): Promise<void> => api.delete(`/api/v1/agent/workers/${id}/permanent`),

	createToken: (data: CreateTokenRequest): Promise<CreateTokenResponse> =>
		api.post("/api/v1/agent/tokens", data),

	listTokens: (): Promise<RegistrationToken[]> => api.get("/api/v1/agent/tokens"),

	workerLogsUrl: (workerId: string, containerID: string): string =>
		withToken(`/api/v1/agent/workers/${workerId}/containers/${containerID}/logs`),
};
