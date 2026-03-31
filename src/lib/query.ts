import { QueryClient } from "@tanstack/svelte-query";

let client: QueryClient;

export function initQueryClient() {
	client = new QueryClient({
		defaultOptions: { queries: { staleTime: 60_000 } },
	});
	return client;
}

export function getQueryClient() {
	if (!client) {
		throw new Error("QueryClient has not been initialized. Call initQueryClient() first.");
	}
	return client;
}
