import { webhooksApi } from "$lib/api/v1/webhooks/index.js";

export const webhookKeys = {
	all: (projectId: string) => ["webhooks", projectId] as const,
	deliveries: (projectId: string, webhookId: string) =>
		["webhooks", projectId, webhookId, "deliveries"] as const,
};

export const webhookQueries = {
	list: (projectId: string) => ({
		queryKey: webhookKeys.all(projectId),
		queryFn: () => webhooksApi.list(projectId),
		staleTime: 30_000,
		enabled: !!projectId,
	}),
	deliveries: (projectId: string, webhookId: string) => ({
		queryKey: webhookKeys.deliveries(projectId, webhookId),
		queryFn: () => webhooksApi.deliveries(projectId, webhookId),
		staleTime: 10_000,
		enabled: !!projectId && !!webhookId,
	}),
};
