import { QueryClient } from "@tanstack/svelte-query";

let client: QueryClient | null = null;

export function initQueryClient() {
	if (!client) {
		client = new QueryClient({
			defaultOptions: {
				queries: {
					staleTime: Infinity,
					refetchOnWindowFocus: false,
					refetchOnReconnect: false,
				},
			},
		});
	}
	return client;
}

export function getQueryClient() {
	if (!client) {
		throw new Error("QueryClient has not been initialized. Call initQueryClient() first.");
	}
	return client;
}
