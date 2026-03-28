import { api } from '$lib/api';
import type {Image} from "$lib/api/v1/types/images.js";


export const imagesApi = {
  list:       (fetchFn?: typeof fetch)                        => api.get<Image[]>('/api/v1/images', fetchFn),
  get:        (id: string, fetchFn?: typeof fetch)            => api.get<Image>(`/api/v1/images/${id}`, fetchFn),
  containers: (id: string)                                    => api.get<{ id: string; name: string }[]>(`/api/v1/images/${encodeURIComponent(id)}/containers`),
  delete:     (id: string, force = false, fetchFn?: typeof fetch) => api.delete<void>(`/api/v1/images/${id}?force=${force}`, fetchFn),
};