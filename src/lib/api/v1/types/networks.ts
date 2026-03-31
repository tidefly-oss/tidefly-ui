// Mirrors: backend/internal/runtime/runtime.go

export interface NetworkSubnet {
	subnet: string;
	gateway: string;
}

export interface Network {
	id: string;
	name: string;
	driver: string;
	scope: string;
	ipam?: NetworkSubnet[];
	labels?: Record<string, string>;
}
