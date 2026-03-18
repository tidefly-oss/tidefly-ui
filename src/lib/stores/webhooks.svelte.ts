import { webhooksApi } from '$lib/api/v1/webhooks/index.js';
import type {
    CreateWebhookRequest,
    UpdateWebhookRequest,
    Webhook,
    WebhookDelivery,
} from '$lib/api/v1/types/webhooks.js';

class WebhooksStore {
    webhooks = $state<Webhook[]>([]);
    loading  = $state(false);
    error    = $state<string | null>(null);

    async load(projectId: string) {
        this.loading = true;
        this.error   = null;
        try {
            this.webhooks = await webhooksApi.list(projectId);
        } catch (e: any) {
            this.error = e?.message ?? 'Failed to load webhooks';
        } finally {
            this.loading = false;
        }
    }

    async create(projectId: string, req: CreateWebhookRequest): Promise<Webhook> {
        const wh = await webhooksApi.create(projectId, req);
        this.webhooks = [wh, ...this.webhooks];
        return wh;
    }

    async update(projectId: string, id: string, req: UpdateWebhookRequest): Promise<void> {
        const wh = await webhooksApi.update(projectId, id, req);
        this.webhooks = this.webhooks.map((w) => (w.id === id ? wh : w));
    }

    async remove(projectId: string, id: string): Promise<void> {
        await webhooksApi.delete(projectId, id);
        this.webhooks = this.webhooks.filter((w) => w.id !== id);
    }

    async rotate(projectId: string, id: string): Promise<string> {
        const { secret } = await webhooksApi.rotate(projectId, id);
        return secret;
    }

    async deliveries(projectId: string, id: string): Promise<WebhookDelivery[]> {
        return webhooksApi.deliveries(projectId, id);
    }
}

export const webhooksStore = new WebhooksStore();