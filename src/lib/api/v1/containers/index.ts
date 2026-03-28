import { api } from '$lib/api';
import type {
    Container,
    ContainerDetails,
    ContainerStatus,
    DeployComposeRequest,
    DeployComposeResponse, ResourceLimits
} from "$lib/api/v1/types/containers.js";
import { tokenStore } from '$lib/api/client';

function withToken(url: string): string {
    const token = tokenStore.get();
    return token ? `${url}?token=${encodeURIComponent(token)}` : url;
}

export const containersApi = {
    list:    (all = false, fetchFn?: typeof fetch) => api.get<Container[]>(`/api/v1/containers?all=${all}`, fetchFn),
    get:     (id: string, fetchFn?: typeof fetch)  => api.get<ContainerDetails>(`/api/v1/containers/${id}`, fetchFn),
    start:   (id: string)                          => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/start`),
    stop:    (id: string)                          => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/stop`),
    restart: (id: string)                          => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/restart`),
    delete:  (id: string, force = false)           => api.delete<void>(`/api/v1/containers/${id}?force=${force}`),

    getResources:    (id: string)                          => api.get<ResourceLimits>(`/api/v1/containers/${id}/resources`),
    updateResources: (id: string, body: ResourceLimits)    => api.patch<{ message: string; restart_required: boolean }>(`/api/v1/containers/${id}/resources`, body),

    deployCompose: (req: DeployComposeRequest)     => api.post<DeployComposeResponse>(`/api/v1/containers/compose`, req),
    deleteStack:   (stackId: string)               => api.delete<void>(`/api/v1/containers/stacks/${stackId}`),

    logsUrl:            (id: string) => withToken(`/api/v1/containers/${id}/logs`),
    statsUrl:           (id: string) => withToken(`/api/v1/containers/${id}/stats`),
    dockerfileBuildUrl: ()           => withToken(`/api/v1/containers/dockerfile`),
};