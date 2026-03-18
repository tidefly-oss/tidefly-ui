export type ServiceStatus = 'deploying' | 'running' | 'stopped' | 'failed';

export interface Service {
	id: string;
	name: string;
	template_slug: string;
	version: string;
	status: ServiceStatus;
	project_id: string;
	created_at: string;
	updated_at: string;
}

export interface PlaintextCredential {
	key: string;
	label: string;
	plaintext: string;
}

export interface DeployRequest {
	template_slug: string;
	project_id: string;
	version: string;
	fields: Record<string, string>;
}

export interface DeployResult {
	service: Service;
	credentials: PlaintextCredential[];
}