import { api } from '$lib/api';
import type {DeployResult, Service, DeployRequest} from "$lib/api/v1/types/deploy.js";

export const deployApi = {
  deploy:    (body: DeployRequest, fetchFn?: typeof fetch) => api.post<DeployResult>('/api/v1/deploy', body, fetchFn),
  list:      (fetchFn?: typeof fetch)                      => api.get<Service[]>('/api/v1/deploy', fetchFn),
  delete:    (id: string, fetchFn?: typeof fetch)          => api.delete<void>(`/api/v1/deploy/${id}`, fetchFn),
  markShown: (id: string, fetchFn?: typeof fetch)          => api.post<void>(`/api/v1/deploy/${id}/credentials/shown`, undefined, fetchFn),
};