import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { dashboardApi } from "$lib/api/v1/dashboard";
import { containersApi } from "$lib/api/v1/containers";
import type { ContainerStatus } from "$lib/api/v1/types";

/**
 * Single aggregated query replacing:
 * /auth/me, /projects, /notifications, /containers?all=true,
 * /images, /networks, /volumes, /admin/settings
 *
 * staleTime: Infinity — WS events invalidate the cache instead of polling.
 */
export function createOverviewQuery() {
    return createQuery(() => ({
        queryKey: ["dashboard", "overview"],
        queryFn: () => dashboardApi.overview(),
        staleTime: Infinity,
    }));
}

/**
 * Start / stop a container. Optimistically updates the overview cache
 * so the UI reflects the change immediately.
 */
export function createActionMutation() {
    const qc = useQueryClient();

    return createMutation(() => ({
        mutationFn: ({ id, action }: { id: string; action: "start" | "stop" }) =>
            action === "start" ? containersApi.start(id) : containersApi.stop(id),
        onMutate: async ({ id, action }) => {
            await qc.cancelQueries({ queryKey: ["dashboard", "overview"] });
            const previous = qc.getQueryData(["dashboard", "overview"]);
            const status: ContainerStatus = action === "start" ? "running" : "exited";
            qc.setQueryData<ReturnType<typeof dashboardApi.overview>>(
                ["dashboard", "overview"],
                (old: any) =>
                    old
                        ? {
                            ...old,
                            containers: old.containers.map((c: any) =>
                                c.id === id ? { ...c, status } : c
                            ),
                        }
                        : old
            );
            return { previous };
        },
        onError: (_err, _vars, ctx: any) => {
            if (ctx?.previous) {
                qc.setQueryData(["dashboard", "overview"], ctx.previous);
            }
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
        },
    }));
}