import { createQuery } from "@tanstack/svelte-query";
import type { DashboardOverview } from "$lib/api";
import { dashboardApi } from "$lib/api/v1/dashboard";

export const dashboardQueries = {
	get: () => ({
		queryKey: ["dashboard"] as const,
		queryFn: (): Promise<DashboardOverview> => dashboardApi.overview(),
		staleTime: Infinity,
		refetchInterval: false as const,
		refetchOnWindowFocus: false as const,
		refetchOnReconnect: false as const,
		refetchOnMount: false as const,
	}),
};

export function createDashboardQuery() {
	return createQuery(() => dashboardQueries.get());
}
