import { api } from '$lib/api';
import type {Volume} from "$lib/api/v1/types/volumes.js";


export const volumesApi = {
  list:   (fetchFn?: typeof fetch) => api.get<Volume[]>('/api/v1/volumes', fetchFn),
  delete: (name: string, fetchFn?: typeof fetch) => api.delete<void>(`/api/v1/volumes/${name}`, fetchFn),
};