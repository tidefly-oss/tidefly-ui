import { api } from '$lib/api';
import type {
    CreateWebhookRequest,
    UpdateWebhookRequest,
    Webhook,
    WebhookDelivery,
} from '$lib/api/v1/types/webhooks.js';

export const webhooksApi = {
    list: (projectId: string, fetchFn?: typeof fetch) =>
        api.get<Webhook[]>(`/api/v1/projects/${projectId}/webhooks`, fetchFn),

    get: (projectId: string, id: string, fetchFn?: typeof fetch) =>
        api.get<Webhook>(`/api/v1/projects/${projectId}/webhooks/${id}`, fetchFn),

    create: (projectId: string, req: CreateWebhookRequest) =>
        api.post<Webhook>(`/api/v1/projects/${projectId}/webhooks`, req),

    update: (projectId: string, id: string, req: UpdateWebhookRequest) =>
        api.patch<Webhook>(`/api/v1/projects/${projectId}/webhooks/${id}`, req),

    delete: (projectId: string, id: string) =>
        api.delete<void>(`/api/v1/projects/${projectId}/webhooks/${id}`),

    rotate: (projectId: string, id: string) =>
        api.post<{ secret: string }>(`/api/v1/projects/${projectId}/webhooks/${id}/rotate`),

    deliveries: (projectId: string, id: string, fetchFn?: typeof fetch) =>
        api.get<WebhookDelivery[]>(
            `/api/v1/projects/${projectId}/webhooks/${id}/deliveries`,
            fetchFn,
        ),
};