import { projectsApi } from "$lib/api";

export const projectKeys = {
    all:        () => ["projects"] as const,
    detail:     (id: string) => ["projects", id] as const,
    containers: (id: string) => ["projects", id, "containers"] as const,
};

export const projectQueries = {
    list: () => ({
        queryKey: projectKeys.all(),
        queryFn:  () => projectsApi.list(),
        staleTime: 30_000,
    }),
    detail: (id: string) => ({
        queryKey: projectKeys.detail(id),
        queryFn:  () => projectsApi.get(id),
        staleTime: 30_000,
        enabled:  !!id,
    }),
    containers: (id: string) => ({
        queryKey: projectKeys.containers(id),
        queryFn:  () => projectsApi.listContainers(id),
        staleTime: 15_000,
        enabled:  !!id,
    }),
};