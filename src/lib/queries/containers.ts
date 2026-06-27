import { createMutation, useQueryClient } from "@tanstack/svelte-query";
import { containersApi } from "$lib/api/v1/containers";
import type { DashboardOverview } from "$lib/api/v1/types/dashboard.js";
import type { ContainerStatus } from "$lib/api/v1/types";

export function createActionMutation() {
    const qc = useQueryClient();
    return createMutation(() => ({
        mutationFn: ({ id, action }: { id: string; action: "start" | "stop" }) =>
            action === "start" ? containersApi.start(id) : containersApi.stop(id),
        onMutate: async ({ id, action }) => {
            await qc.cancelQueries({ queryKey: ["dashboard"] });
            const previous = qc.getQueryData(["dashboard"]);
            const status: ContainerStatus = action === "start" ? "running" : "exited";
            qc.setQueryData<DashboardOverview>(["dashboard"], (old) =>
                old
                    ? {
                        ...old,
                        containers: old.containers.map((c) =>
                            c.id === id ? { ...c, status } : c
                        ),
                    }
                    : old
            );
            return { previous };
        },
        onError: (_err, _vars, ctx: any) => {
            if (ctx?.previous) qc.setQueryData(["dashboard"], ctx.previous);
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: ["dashboard"] });
        },
    }));
}