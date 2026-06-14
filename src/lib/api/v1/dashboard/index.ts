import { api } from "$lib/api";
import type { DashboardOverview } from "$lib/api/v1/types";

export const dashboardApi = {
    overview: (): Promise<DashboardOverview> =>
        api.get<DashboardOverview>("/api/v1/dashboard/overview"),
};