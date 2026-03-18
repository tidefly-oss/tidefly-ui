import { api } from '$lib/api';
import type {ServiceTemplate, TemplateSummary} from "$lib/api/v1/types/templates.js";


export const templatesApi = {
  list: (fetchFn?: typeof fetch)              => api.get<TemplateSummary[]>('/api/v1/services/templates', fetchFn),
  get:  (slug: string, fetchFn?: typeof fetch) => api.get<ServiceTemplate>(`/api/v1/services/templates/${slug}`, fetchFn),
};