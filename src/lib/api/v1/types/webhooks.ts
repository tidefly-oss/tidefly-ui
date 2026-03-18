export type WebhookTriggerType = 'redeploy' | 'deploy';
export type WebhookStatus = 'pending' | 'success' | 'failed';
export type WebhookProvider = 'github' | 'gitlab' | 'gitea' | 'bitbucket' | 'generic';

export interface Webhook {
    id: string;
    created_at: string;
    updated_at: string;
    project_id: string;
    created_by: string;
    name: string;
    active: boolean;
    branch: string;
    provider: WebhookProvider;
    trigger_type: WebhookTriggerType;
    service_id?: string;
    git_integration_id?: string;
    repo_url?: string;
    template_slug?: string;
    field_overrides?: string;
    last_triggered_at?: string;
    last_status?: WebhookStatus;
    last_error?: string;
    trigger_count: number;
    // Only returned on create
    secret?: string;
    url: string;
}

export interface WebhookDelivery {
    id: string;
    created_at: string;
    webhook_id: string;
    provider: string;
    event_type: string;
    branch: string;
    commit: string;
    commit_msg: string;
    pushed_by: string;
    repo_url: string;
    status: WebhookStatus;
    error_msg?: string;
    job_id?: string;
    duration_ms: number;
}

export interface CreateWebhookRequest {
    name: string;
    trigger_type: WebhookTriggerType;
    provider?: WebhookProvider;
    branch?: string;
    service_id?: string;
    git_integration_id?: string;
    repo_url?: string;
    template_slug?: string;
    field_overrides?: string;
}

export interface UpdateWebhookRequest {
    name?: string;
    branch?: string;
    active?: boolean;
    field_overrides?: string;
}