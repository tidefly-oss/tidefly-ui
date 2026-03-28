<script lang="ts">
    import type {CreateWebhookRequest, Webhook} from '$lib/api/v1/types/webhooks.js';
    import WebhookCreateDialog from '$lib/components/webhooks/WebhookCreateDialog.svelte';
    import WebhookRow from '$lib/components/webhooks/WebhookRow.svelte';
    import * as Select from "$lib/components/ui/select/index.js";
    import {Button} from '$lib/components/ui/button';
    import {projectsStore} from '$lib/stores/projects.svelte.js';
    import {webhooksStore} from '$lib/stores/webhooks.svelte.js';
    import {auth} from '$lib/stores/auth.svelte.js';
    import {BookOpen, PlusIcon, ZapIcon} from '@lucide/svelte';
    import {onMount} from 'svelte';
    import {goto} from "$app/navigation";

    const isAdmin = $derived(auth.user?.role === 'admin');

    const visibleProjects = $derived(
        isAdmin
            ? projectsStore.projects
            : projectsStore.projects.filter((p) => auth.projectIds.includes(p.id)),
    );

    let selectedProjectId = $state<string>('');
    let createOpen = $state(false);

    // Auto-select first project
    $effect(() => {
        if (!selectedProjectId && visibleProjects.length > 0) {
            selectedProjectId = visibleProjects[0].id;
        }
    });

    // Load webhooks when project changes
    $effect(() => {
        if (selectedProjectId) {
            webhooksStore.load(selectedProjectId);
        }
    });

    onMount(() => projectsStore.load());

    async function handleCreate(req: CreateWebhookRequest): Promise<Webhook> {
        return await webhooksStore.create(selectedProjectId, req);
    }
</script>

<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <ZapIcon class="size-5"/>
            <h1 class="text-xl font-semibold">Webhooks</h1>
        </div>
        <div class="flex items-center gap-2">
            <Button size="sm" onclick={() => (createOpen = true)} disabled={!selectedProjectId}>
                <PlusIcon class="size-4 mr-1"/>
                Add webhook
            </Button>
        </div>
    </div>

    <!-- Project selector -->
    {#if visibleProjects.length > 1}
        <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">Project</span>
            <Select.Root
                    type="single"
                    value={selectedProjectId}
                    onValueChange={(v) => { if (v) selectedProjectId = v; }}
            >
                <Select.Trigger class="w-56">
                    {visibleProjects.find((p) => p.id === selectedProjectId)?.name ?? 'Select project'}
                </Select.Trigger>
                <Select.Content>
                    {#each visibleProjects as p (p.id)}
                        <Select.Item value={p.id}>{p.name}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        </div>
    {/if}

    <!-- Error -->
    {#if webhooksStore.error}
        <p class="text-sm text-destructive">{webhooksStore.error}</p>
    {/if}

    <!-- Loading -->
    {#if webhooksStore.loading}
        <div class="space-y-3">
            {#each [1, 2] as _}
                <div class="h-24 rounded-lg border bg-muted animate-pulse"></div>
            {/each}
        </div>

        <!-- Empty -->
    {:else if webhooksStore.webhooks.length === 0}
        <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ZapIcon class="size-10 text-muted-foreground/40"/>
            <p class="text-sm text-muted-foreground">No webhooks yet.</p>
            <p class="text-xs text-muted-foreground max-w-sm">
                Create a webhook to automatically trigger deploys when you push to your Git repository.
            </p>
            <Button size="sm" variant="outline" onclick={() => (createOpen = true)}>
                <PlusIcon class="size-4 mr-1"/>
                Add first webhook
            </Button>
        </div>

        <!-- List -->
    {:else}
        <div class="space-y-3">
            {#each webhooksStore.webhooks as wh (wh.id)}
                <WebhookRow
                        webhook={wh}
                        ondelete={(id) => webhooksStore.remove(selectedProjectId, id)}
                        onrotate={(id) => webhooksStore.rotate(selectedProjectId, id)}
                        onloaddeliveries={(id) => webhooksStore.deliveries(selectedProjectId, id)}
                />
            {/each}
        </div>
    {/if}
</div>

<WebhookCreateDialog
        projectId={selectedProjectId}
        bind:open={createOpen}
        oncreated={handleCreate}
/>