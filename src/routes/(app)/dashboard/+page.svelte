<script lang="ts">
import { ContainerIcon, DatabaseIcon, PlusIcon } from "@lucide/svelte";
import { untrack } from "svelte";
import ContainerList from "$lib/components/dashboard/ContainerList.svelte";
import DashboardHeader from "$lib/components/dashboard/DashboardHeader.svelte";
import { createActionMutation, createOverviewQuery } from "$lib/components/dashboard/queries";
import RecentActivity from "$lib/components/dashboard/RecentActivity.svelte";
import ResourcePanel from "$lib/components/dashboard/ResourcePanel.svelte";
import StatCards from "$lib/components/dashboard/StatCards.svelte";
import { Button } from "$lib/components/ui/button/index.js";
import { notificationsStore } from "$lib/stores/notifications.svelte";
import { systemStore } from "$lib/stores/system.svelte";

const overviewQuery = createOverviewQuery();
const actionMutation = createActionMutation();

const data = $derived(overviewQuery.data);
const isPending = $derived(overviewQuery.isPending);

const containers = $derived(data?.containers ?? []);
const images = $derived(data?.images ?? []);
const networks = $derived(data?.networks ?? []);
const volumes = $derived(data?.volumes ?? []);

// Notifications: seed from overview on load, then live via notificationsStore (WS)
$effect(() => {
	const notifs = data?.notifications;
	if (notifs && untrack(() => notificationsStore.items.length === 0)) {
		notificationsStore.items = notifs;
	}
});
const notifications = $derived(notificationsStore.items.slice(0, 6));

const metrics = $derived(systemStore.metrics);

const cpuPct = $derived(metrics?.cpu_percent ?? 0);
const memPct = $derived(metrics?.mem_percent ?? 0);
const diskPct = $derived(
	metrics?.disk_used && metrics.disk_total ? (metrics.disk_used / metrics.disk_total) * 100 : 0
);
const hasResourceWarning = $derived(cpuPct > 80 || memPct > 80 || diskPct > 85);
const systemHealthy = $derived(
	!hasResourceWarning && notifications.filter((n) => !n.acknowledged_at).length === 0
);

const isEmpty = $derived(!isPending && containers.length === 0);

const pendingId = $derived(actionMutation.isPending ? actionMutation.variables?.id : undefined);
</script>

<div class="space-y-5">
    <DashboardHeader
            {cpuPct}
            {memPct}
            {diskPct}
            hasWarning={hasResourceWarning}
            {systemHealthy}
            unreadCount={notificationsStore.unreadCount}
    />

    <StatCards {isPending} {containers} {images} {networks} {volumes} />

    {#if isEmpty}
        <div class="bg-card border rounded-xl p-10 text-center">
            <ContainerIcon class="size-10 text-muted-foreground/30 mx-auto mb-4" />
            <h2 class="text-lg font-semibold mb-1">Nothing running yet</h2>
            <p class="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Deploy a service from a template, or run a custom container to get started.
            </p>
            <div class="flex items-center justify-center gap-3">
                <a href="/dashboard/containers/templates">
                    <Button variant="outline" size="sm" class="gap-1.5">
                        <DatabaseIcon class="size-3.5" /> Browse Templates
                    </Button>
                </a>
                <a href="/dashboard/containers?action=dockerfile">
                    <Button size="sm" class="gap-1.5">
                        <PlusIcon class="size-3.5" /> Run Container
                    </Button>
                </a>
            </div>
        </div>
    {:else}
        <div class="grid gap-5 lg:grid-cols-3">
            <div class="lg:col-span-2 space-y-5">
                <ContainerList
                        {isPending}
                        {containers}
                        {pendingId}
                        onAction={(id, action) => actionMutation.mutate({ id, action })}
                />
                <RecentActivity {notifications} />
            </div>
            <div class="space-y-5">
                <ResourcePanel {metrics} />
            </div>
        </div>
    {/if}
</div>