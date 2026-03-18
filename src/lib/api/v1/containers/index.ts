import { api } from '$lib/api';
import type {
  Container,
  ContainerDetails,
  ContainerStatus,
  DeployComposeRequest,
  DeployComposeResponse
} from "$lib/api/v1/types/containers.js";

export const containersApi = {
  list:    (all = false, fetchFn?: typeof fetch) => api.get<Container[]>(`/api/v1/containers?all=${all}`, fetchFn),
  get:     (id: string, fetchFn?: typeof fetch)  => api.get<ContainerDetails>(`/api/v1/containers/${id}`, fetchFn),
  start:   (id: string)                          => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/start`),
  stop:    (id: string)                          => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/stop`),
  restart: (id: string)                          => api.post<{ status: ContainerStatus }>(`/api/v1/containers/${id}/restart`),
  delete:  (id: string, force = false)           => api.delete<void>(`/api/v1/containers/${id}?force=${force}`),
  logsUrl:  (id: string)                         => `/api/v1/containers/${id}/logs`,
  statsUrl: (id: string)                         => `/api/v1/containers/${id}/stats`,
  deployCompose: (req: DeployComposeRequest)     => api.post<DeployComposeResponse>(`/api/v1/containers/compose`, req),
  deleteStack:   (stackId: string)               => api.delete<void>(`/api/v1/containers/stacks/${stackId}`),

  dockerfileBuildUrl: ()                         => `/api/v1/containers/dockerfile`,
};