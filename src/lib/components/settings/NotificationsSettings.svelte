<script lang="ts">
    import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { adminApi } from '$lib/api/v1/admin';
    import { toast } from 'svelte-sonner';
    import { BellIcon, CircleCheckBig, CircleIcon, FlaskConicalIcon } from '@lucide/svelte';

    const qc = useQueryClient();

    const settingsQuery = createQuery(() => ({
        queryKey: ['admin-settings'],
        queryFn: () => adminApi.getSettings(),
    }));

    const updateMutation = createMutation(() => ({
        mutationFn: (data: Record<string, unknown>) => adminApi.updateSettings(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-settings'] });
            toast.success('Notification settings saved');
        },
        onError: () => toast.error('Failed to save notification settings'),
    }));

    const testMutation = createMutation(() => ({
        mutationFn: (channel: string) => adminApi.testNotification(channel),
        onSuccess: (_: unknown, channel: string) => toast.success(`Test sent via ${channel}`),
        onError: (_: unknown, channel: string) => toast.error(`Test failed via ${channel}`),
    }));

    const settings = $derived(settingsQuery.data ?? null);

    let enabled               = $state(false);
    let slackWebhookURL       = $state('');
    let discordWebhookURL     = $state('');
    let notifyOnDeploy        = $state(true);
    let notifyOnContainerDown = $state(true);
    let notifyOnWebhookFail   = $state(true);

    $effect(() => {
        if (settings) {
            enabled               = settings.notifications_enabled   ?? false;
            slackWebhookURL       = settings.slack_webhook_url       ?? '';
            discordWebhookURL     = settings.discord_webhook_url     ?? '';
            notifyOnDeploy        = settings.notify_on_deploy        ?? true;
            notifyOnContainerDown = settings.notify_on_container_down ?? true;
            notifyOnWebhookFail   = settings.notify_on_webhook_fail  ?? true;
        }
    });

    const slackConfigured   = $derived(!!settings?.slack_webhook_url);
    const discordConfigured = $derived(!!settings?.discord_webhook_url);
    const smtpConfigured    = $derived(!!settings?.smtp_host);

    function save() {
        updateMutation.mutate({
            notifications_enabled:    enabled,
            slack_webhook_url:        slackWebhookURL,
            discord_webhook_url:      discordWebhookURL,
            notify_on_deploy:         notifyOnDeploy,
            notify_on_container_down: notifyOnContainerDown,
            notify_on_webhook_fail:   notifyOnWebhookFail,
        });
    }

    const triggers = [
        { key: 'deploy',    label: 'Successful deploy',       desc: 'When a service or container is deployed' },
        { key: 'container', label: 'Container down',          desc: 'When a container stops unexpectedly'     },
        { key: 'webhook',   label: 'Webhook delivery failed', desc: 'When a webhook job fails'                },
    ] as const;

    function triggerValue(key: typeof triggers[number]['key']): boolean {
        if (key === 'deploy')    return notifyOnDeploy;
        if (key === 'container') return notifyOnContainerDown;
        return notifyOnWebhookFail;
    }

    function triggerToggle(key: typeof triggers[number]['key']) {
        if (key === 'deploy')    notifyOnDeploy        = !notifyOnDeploy;
        if (key === 'container') notifyOnContainerDown = !notifyOnContainerDown;
        if (key === 'webhook')   notifyOnWebhookFail   = !notifyOnWebhookFail;
    }
</script>

<div class="space-y-4">

    <!-- Master toggle -->
    <div class="rounded-xl border bg-card px-5 py-4 flex items-center justify-between">
        <div>
            <h2 class="text-sm font-semibold">Notifications</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Send alerts to Slack, Discord, or email</p>
        </div>
        <button
                aria-label="Enable or disable all notifications"
                type="button"
                role="switch"
                aria-checked={enabled}
                onclick={() => (enabled = !enabled)}
                class="relative w-9 h-5 rounded-full transition-colors shrink-0 {enabled ? 'bg-primary' : 'bg-muted border border-border'}"
        >
            <div class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform {enabled ? 'translate-x-4' : ''}"></div>
        </button>
    </div>

    <!-- Channels -->
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Channels</div>

        <!-- Slack -->
        <div class="px-5 py-4 space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="size-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <svg class="size-4 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-medium">Slack</p>
                        <p class="text-xs text-muted-foreground">Incoming Webhook URL</p>
                    </div>
                </div>
                {#if slackConfigured}
                    <span class="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CircleCheckBig class="size-3" /> Configured
                    </span>
                {:else}
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <CircleIcon class="size-3" /> Not set
                    </span>
                {/if}
            </div>
            <div class="flex gap-2">
                <Input bind:value={slackWebhookURL} placeholder="https://hooks.slack.com/services/..." class="font-mono text-xs" />
                <Button
                        variant="outline" size="sm" class="shrink-0"
                        disabled={!slackWebhookURL || testMutation.isPending}
                        onclick={() => testMutation.mutate('slack')}
                >
                    <FlaskConicalIcon class="size-3.5 mr-1.5" /> Test
                </Button>
            </div>
        </div>

        <!-- Discord -->
        <div class="px-5 py-4 space-y-3">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="size-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <svg class="size-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                        </svg>
                    </div>
                    <div>
                        <p class="text-sm font-medium">Discord</p>
                        <p class="text-xs text-muted-foreground">Webhook URL</p>
                    </div>
                </div>
                {#if discordConfigured}
                    <span class="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CircleCheckBig class="size-3" /> Configured
                    </span>
                {:else}
                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        <CircleIcon class="size-3" /> Not set
                    </span>
                {/if}
            </div>
            <div class="flex gap-2">
                <Input bind:value={discordWebhookURL} placeholder="https://discord.com/api/webhooks/..." class="font-mono text-xs" />
                <Button
                        variant="outline" size="sm" class="shrink-0"
                        disabled={!discordWebhookURL || testMutation.isPending}
                        onclick={() => testMutation.mutate('discord')}
                >
                    <FlaskConicalIcon class="size-3.5 mr-1.5" /> Test
                </Button>
            </div>
        </div>

        <!-- Email -->
        <div class="px-5 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <div class="size-7 rounded-lg bg-muted flex items-center justify-center">
                        <BellIcon class="size-4 text-muted-foreground" />
                    </div>
                    <div>
                        <p class="text-sm font-medium">Email</p>
                        <p class="text-xs text-muted-foreground">Uses SMTP settings from the SMTP tab</p>
                    </div>
                </div>
                {#if smtpConfigured}
                    <div class="flex items-center gap-2">
                        <span class="inline-flex items-center gap-1 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            <CircleCheckBig class="size-3" /> Ready
                        </span>
                        <Button
                                variant="outline" size="sm"
                                disabled={testMutation.isPending}
                                onclick={() => testMutation.mutate('email')}
                        >
                            <FlaskConicalIcon class="size-3.5 mr-1.5" /> Test
                        </Button>
                    </div>
                {:else}
                    <span class="text-xs text-muted-foreground">Configure SMTP first</span>
                {/if}
            </div>
        </div>
    </div>

    <!-- Triggers -->
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Notify on</div>
        {#each triggers as t (t.key)}
            <div class="px-5 py-3.5 flex items-center justify-between gap-4">
                <div>
                    <p class="text-sm font-medium">{t.label}</p>
                    <p class="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <button
                        aria-label="Enable or disable {t.label} notifications"
                        type="button"
                        role="switch"
                        aria-checked={triggerValue(t.key)}
                        onclick={() => triggerToggle(t.key)}
                        class="relative w-9 h-5 rounded-full transition-colors shrink-0 {triggerValue(t.key) ? 'bg-primary' : 'bg-muted border border-border'}"
                >
                    <div class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform {triggerValue(t.key) ? 'translate-x-4' : ''}"></div>
                </button>
            </div>
        {/each}
    </div>

    <!-- Save -->
    <div class="flex justify-end">
        <Button onclick={save} disabled={updateMutation.isPending} size="sm">
            {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
        </Button>
    </div>
</div>