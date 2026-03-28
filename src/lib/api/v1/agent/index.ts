import { api } from "../../client";

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
  registered_by_user_id: string;
  created_at: string;
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
  listWorkers: (): Promise<WorkerNode[]> =>
    api.get("/api/v1/agent/workers"),

  revokeWorker: (id: string): Promise<void> =>
    api.delete(`/api/v1/agent/workers/${id}`),

  createToken: (data: CreateTokenRequest): Promise<CreateTokenResponse> =>
    api.post("/api/v1/agent/tokens", data),

  listTokens: (): Promise<RegistrationToken[]> =>
    api.get("/api/v1/agent/tokens"),
};