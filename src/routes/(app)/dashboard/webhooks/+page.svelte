<script lang="ts">
    import type { CreateWebhookRequest, Webhook } from "$lib/api/v1/types/webhooks.js";
    import WebhookCreateDialog from "$lib/components/webhooks/WebhookCreateDialog.svelte";
    import WebhookRow from "$lib/components/webhooks/WebhookRow.svelte";
    import * as Select from "$lib/components/ui/select/index.js";
    import { Button } from "$lib/components/ui/button";
    import { auth } from "$lib/stores/auth.svelte.js";
    import { projectQueries } from "$lib/queries/projects.js";
    import { webhookQueries, webhookKeys } from "$lib/queries/webhooks.js";
    import { webhooksApi } from "$lib/api/v1/webhooks/index.js";
    import { type WebhookDelivery } from "$lib/api/v1/types/webhooks.js";
    import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
    import { PlusIcon, ZapIcon } from "@lucide/svelte";

    const qc = useQueryClient();
    const isAdmin = $derived(auth.user?.role === "admin");

    // ── Projects ──────────────────────────────────────────────────────────────
    const projectsQuery = createQuery(() => projectQueries.list());
    const visibleProjects = $derived(() => {
        const all = projectsQuery.data ?? [];
        return isAdmin ? all : all.filter((p) => auth.projectIds.includes(p.id));
    });

    let selectedProjectId = $state("");
    $effect(() => {
        if (!selectedProjectId && visibleProjects().length > 0) {
            selectedProjectId = visibleProjects()[0].id;
        }
    });

    // ── Webhooks ──────────────────────────────────────────────────────────────
    const webhooksQuery = createQuery(() => webhookQueries.list(selectedProjectId));
    const webhooks = $derived(webhooksQuery.data ?? []);

    // ── Mutations ─────────────────────────────────────────────────────────────
    const createMut = createMutation(() => ({
        mutationFn: (req: CreateWebhookRequest) => webhooksApi.create(selectedProjectId, req),
        onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all(selectedProjectId) }),
    }));

    const deleteMut = createMutation(() => ({
        mutationFn: (id: string) => webhooksApi.delete(selectedProjectId, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all(selectedProjectId) }),
    }));

    const rotateMut = createMutation(() => ({
        mutationFn: (id: string) => webhooksApi.rotate(selectedProjectId, id),
        onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all(selectedProjectId) }),
    }));

    let createOpen = $state(false);

    async function handleCreate(req: CreateWebhookRequest): Promise<Webhook> {
        return createMut.mutateAsync(req);
    }

    function getDeliveries(projectId: string, id: string): WebhookDelivery[] {
        return qc.getQueryData<WebhookDelivery[]>(webhookKeys.deliveries(projectId, id)) ?? [];
    }
</script>

<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
            <ZapIcon class="size-5" />
            <h1 class="text-xl font-semibold">Webhooks</h1>
        </div>
        <Button size="sm" onclick={() => (createOpen = true)} disabled={!selectedProjectId}>
            <PlusIcon class="size-4 mr-1" /> Add webhook
        </Button>
    </div>

    <!-- Project selector -->
    {#if visibleProjects().length > 1}
        <div class="flex items-center gap-2">
            <span class="text-sm text-muted-foreground">Project</span>
            <Select.Root
                    type="single"
                    value={selectedProjectId}
                    onValueChange={(v) => { if (v) selectedProjectId = v; }}
            >
                <Select.Trigger class="w-56">
                    {visibleProjects().find((p) => p.id === selectedProjectId)?.name ?? "Select project"}
                </Select.Trigger>
                <Select.Content>
                    {#each visibleProjects() as p (p.id)}
                        <Select.Item value={p.id}>{p.name}</Select.Item>
                    {/each}
                </Select.Content>
            </Select.Root>
        </div>
    {/if}

    <!-- Loading -->
    {#if webhooksQuery.isPending && selectedProjectId}
        <div class="space-y-3">
            {#each Array(2) as _, i (i)}
                <div class="h-24 rounded-lg border bg-muted animate-pulse"></div>
            {/each}
        </div>

        <!-- Empty -->
    {:else if webhooks.length === 0}
        <div class="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ZapIcon class="size-10 text-muted-foreground/40" />
            <p class="text-sm text-muted-foreground">No webhooks yet.</p>
            <p class="text-xs text-muted-foreground max-w-sm">
                Create a webhook to automatically trigger deploys when you push to your Git repository.
            </p>
            <Button size="sm" variant="outline" onclick={() => (createOpen = true)}>
                <PlusIcon class="size-4 mr-1" /> Add first webhook
            </Button>
        </div>

        <!-- List -->
    {:else}
        <div class="space-y-3">
            {#each webhooks as wh (wh.id)}
                <WebhookRow
                        webhook={wh}
                        ondelete={async (id) => deleteMut.mutateAsync(id)}
                        onrotate={async (id) => rotateMut.mutateAsync(id)}
                        onloaddeliveries={async (id) => {
                            await qc.invalidateQueries({ queryKey: webhookKeys.deliveries(selectedProjectId, id) });
                            return getDeliveries(selectedProjectId, id);
                        }}
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