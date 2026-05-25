<script lang="ts">
import {
	ActivityIcon,
	BoxIcon,
	ChevronRightIcon,
	CircleAlert,
	CircleIcon,
	ContainerIcon,
	CpuIcon,
	DatabaseIcon,
	HardDriveIcon,
	ImageIcon,
	InfoIcon,
	NetworkIcon,
	PlayIcon,
	PlusIcon,
	SquareIcon,
} from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { containersApi } from "$lib/api/v1/containers";
import { imagesApi } from "$lib/api/v1/images";
import { networksApi } from "$lib/api/v1/networks";
import { notificationsApi } from "$lib/api/v1/notifications";
import type { ContainerStatus } from "$lib/api/v1/types";
import { volumesApi } from "$lib/api/v1/volumes";
import { Button } from "$lib/components/ui/button/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";
import { systemStore } from "$lib/stores/system.svelte";

const qc = useQueryClient();

const containersQuery = createQuery(() => ({
	queryKey: ["containers"],
	queryFn: () => containersApi.list(true),
	refetchInterval: 30_000,
}));
const imagesQuery = createQuery(() => ({
	queryKey: ["images"],
	queryFn: () => imagesApi.list(),
	staleTime: 60_000,
}));
const networksQuery = createQuery(() => ({
	queryKey: ["networks"],
	queryFn: () => networksApi.list(),
	staleTime: 60_000,
}));
const volumesQuery = createQuery(() => ({
	queryKey: ["volumes"],
	queryFn: () => volumesApi.list(),
	staleTime: 60_000,
}));
const notificationsQuery = createQuery(() => ({
	queryKey: ["notifications"],
	queryFn: () => notificationsApi.list(),
	refetchInterval: 30_000,
	staleTime: 15_000,
}));

const actionMutation = createMutation(() => ({
	mutationFn: ({ id, action }: { id: string; action: "start" | "stop" }) =>
		action === "start" ? containersApi.start(id) : containersApi.stop(id),
	onSuccess: (_, { id, action }) => {
		const status: ContainerStatus = action === "start" ? "running" : "exited";
		qc.setQueryData<{ id: string; status: ContainerStatus }[]>(
			["containers"],
			(old) => old?.map((c) => (c.id === id ? { ...c, status } : c)) ?? []
		);
	},
}));

const containers = $derived(containersQuery.data ?? []);
const images = $derived(imagesQuery.data ?? []);
const networks = $derived(networksQuery.data ?? []);
const volumes = $derived(volumesQuery.data ?? []);
const notifications = $derived((notificationsQuery.data ?? []).slice(0, 6));
const metrics = $derived(systemStore.metrics);

const runningCount = $derived(containers.filter((c) => c.status === "running").length);
const stoppedCount = $derived(containers.filter((c) => c.status !== "running").length);

const cpuPct = $derived(metrics?.cpu_percent ?? 0);
const memPct = $derived(metrics?.mem_percent ?? 0);
const diskPct = $derived(
	metrics?.disk_used && metrics.disk_total ? (metrics.disk_used / metrics.disk_total) * 100 : 0
);

const hasResourceWarning = $derived(cpuPct > 80 || memPct > 80 || diskPct > 85);
const systemHealthy = $derived(
	!hasResourceWarning && notifications.filter((n) => n.acknowledged_at === null).length === 0
);

const isEmpty = $derived(!containersQuery.isPending && containers.length === 0);

function statusColor(status: ContainerStatus) {
	const m: Record<ContainerStatus, string> = {
		running: "#22c55e",
		stopped: "#6b7280",
		exited: "#6b7280",
		dead: "#ef4444",
		paused: "#f59e0b",
		restarting: "#3b82f6",
		created: "#3b82f6",
		unknown: "#6b7280",
	};
	return m[status] ?? "#6b7280";
}

function resourceBarColor(pct: number) {
	return pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-primary";
}

function resourceTextColor(pct: number) {
	return pct > 80 ? "text-destructive" : pct > 60 ? "text-amber-500" : "text-foreground";
}

function severityColor(severity: string) {
	if (severity === "FATAL" || severity === "ERROR") return "text-destructive";
	if (severity === "WARN") return "text-amber-500";
	return "text-muted-foreground";
}

function severityDot(severity: string) {
	if (severity === "FATAL" || severity === "ERROR") return "#ef4444";
	if (severity === "WARN") return "#f59e0b";
	return "#6b7280";
}

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}

const statCards = $derived([
	{
		href: "/dashboard/containers",
		icon: ContainerIcon,
		query: containersQuery,
		value: containers.length,
		label: "Containers",
		tooltip: "Docker containers running on this host",
		sub:
			containers.length > 0
				? `${runningCount} running${stoppedCount > 0 ? ` · ${stoppedCount} stopped` : ""}`
				: "None yet",
		bar: containers.length > 0 ? runningCount / containers.length : null,
	},
	{
		href: "/dashboard/images",
		icon: ImageIcon,
		query: imagesQuery,
		value: images.length,
		label: "Images",
		tooltip: "Downloaded Docker images available locally",
		sub: "Local registry",
		bar: null,
	},
	{
		href: "/dashboard/volumes",
		icon: BoxIcon,
		query: volumesQuery,
		value: volumes.length,
		label: "Volumes",
		tooltip: "Persistent storage attached to containers",
		sub: "Persistent storage",
		bar: null,
	},
	{
		href: "/dashboard/networks",
		icon: NetworkIcon,
		query: networksQuery,
		value: networks.length,
		label: "Networks",
		tooltip: "Docker networks for container isolation",
		sub: "Project isolation",
		bar: null,
	},
]);
</script>

<div class="space-y-5">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>
            <Tooltip.Provider delayDuration={200}>
                <Tooltip.Root>
                    <Tooltip.Trigger>
                        <span
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border
							{systemHealthy
                                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}"
                        >
                            <span
                                class="size-1.5 rounded-full {systemHealthy
                                    ? 'bg-green-500'
                                    : 'bg-amber-500 animate-pulse'}"
                            ></span>
                            {systemHealthy
                                ? "All systems healthy"
                                : "Needs attention"}
                        </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="text-xs max-w-48">
                        {#if cpuPct > 80}CPU at {cpuPct.toFixed(0)}% ·
                        {/if}
                        {#if memPct > 80}Memory at {memPct.toFixed(0)}% ·
                        {/if}
                        {#if diskPct > 85}Disk at {diskPct.toFixed(0)}%{/if}
                        {#if systemHealthy}No issues detected{/if}
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>
        <div class="flex items-center gap-2">
            <a href="/dashboard/containers/templates">
                <Button size="sm" variant="outline" class="gap-1.5">
                    <DatabaseIcon class="size-3.5" /> Deploy Service
                </Button>
            </a>
            <a href="/dashboard/containers?action=dockerfile">
                <Button size="sm" class="gap-1.5">
                    <PlusIcon class="size-3.5" /> Run Container
                </Button>
            </a>
        </div>
    </div>

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {#each statCards as card}
            <Tooltip.Provider delayDuration={300}>
                <Tooltip.Root>
                    <Tooltip.Trigger class="text-left w-full">
                        <a
                            href={card.href}
                            class="bg-card border rounded-xl p-4 hover:border-primary/40 transition-all group flex flex-col"
                        >
                            <div class="flex items-start justify-between mb-3">
                                <div class="bg-muted rounded-lg p-1.5">
                                    <card.icon
                                        class="size-3.5 text-muted-foreground"
                                    />
                                </div>
                                <div class="flex items-center gap-1">
                                    <InfoIcon
                                        class="size-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors"
                                    />
                                    <ChevronRightIcon
                                        class="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    />
                                </div>
                            </div>
                            {#if card.query.isPending}
                                <div
                                    class="h-7 bg-muted rounded animate-pulse w-10 mb-1"
                                ></div>
                                <div
                                    class="h-3 bg-muted rounded animate-pulse w-20"
                                ></div>
                            {:else}
                                <div class="text-2xl font-bold tabular-nums">
                                    {card.value}
                                </div>
                                <div
                                    class="text-xs text-muted-foreground mt-0.5"
                                >
                                    {card.label}
                                </div>
                                {#if card.bar !== null}
                                    <div
                                        class="flex gap-0.5 h-0.5 rounded-full overflow-hidden mt-2.5 bg-muted"
                                    >
                                        <div
                                            class="bg-green-500 transition-all"
                                            style="width: {card.bar * 100}%"
                                        ></div>
                                    </div>
                                {/if}
                                <div
                                    class="text-xs mt-1.5 text-muted-foreground"
                                >
                                    {card.sub}
                                </div>
                            {/if}
                        </a>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="text-xs max-w-48"
                        >{card.tooltip}</Tooltip.Content
                    >
                </Tooltip.Root>
            </Tooltip.Provider>
        {/each}
    </div>

    {#if isEmpty}
        <!-- Empty state -->
        <div class="bg-card border rounded-xl p-10 text-center">
            <ContainerIcon
                class="size-10 text-muted-foreground/30 mx-auto mb-4"
            />
            <h2 class="text-lg font-semibold mb-1">Nothing running yet</h2>
            <p class="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Deploy a service from a template, or run a custom container to
                get started.
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
            <!-- Left: Containers -->
            <div class="lg:col-span-2 space-y-5">
                <div class="bg-card border rounded-xl overflow-hidden">
                    <div
                        class="flex items-center justify-between px-5 py-3.5 border-b"
                    >
                        <div class="flex items-center gap-2">
                            <h2 class="font-medium text-sm">Containers</h2>
                            {#if !containersQuery.isPending && containers.length > 0}
                                <span
                                    class="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums"
                                >
                                    {runningCount}/{containers.length}
                                </span>
                            {/if}
                        </div>
                        <a
                            href="/dashboard/containers"
                            class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            View all <ChevronRightIcon class="size-3" />
                        </a>
                    </div>
                    <div class="divide-y">
                        {#if containersQuery.isPending}
                            {#each Array(3) as _, i (i)}
                                <div
                                    class="px-5 py-3.5 flex items-center gap-3 animate-pulse"
                                >
                                    <div
                                        class="size-2 rounded-full bg-muted shrink-0"
                                    ></div>
                                    <div class="flex-1 space-y-1.5">
                                        <div
                                            class="h-3.5 bg-muted rounded w-32"
                                        ></div>
                                        <div
                                            class="h-3 bg-muted rounded w-48"
                                        ></div>
                                    </div>
                                </div>
                            {/each}
                        {:else}
                            {#each containers.slice(0, 8) as c (c.id)}
                                <div
                                    class="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors group"
                                >
                                    <Tooltip.Provider delayDuration={300}>
                                        <Tooltip.Root>
                                            <Tooltip.Trigger>
                                                <CircleIcon
                                                    class="size-2 shrink-0 fill-current"
                                                    style="color: {statusColor(
                                                        c.status,
                                                    )}"
                                                />
                                            </Tooltip.Trigger>
                                            <Tooltip.Content
                                                class="text-xs capitalize"
                                                >{c.status}</Tooltip.Content
                                            >
                                        </Tooltip.Root>
                                    </Tooltip.Provider>
                                    <div class="flex-1 min-w-0">
                                        <div
                                            class="flex items-center gap-2 min-w-0"
                                        >
                                            <span
                                                class="text-sm font-medium truncate"
                                                >{c.name}</span
                                            >
                                            <span
                                                class="text-xs text-muted-foreground font-mono truncate hidden sm:block max-w-48"
                                                >{c.image}</span
                                            >
                                        </div>
                                    </div>
                                    <div
                                        class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    >
                                        {#if c.status === "running"}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="size-7"
                                                disabled={actionMutation.isPending &&
                                                    actionMutation.variables
                                                        ?.id === c.id}
                                                onclick={() =>
                                                    actionMutation.mutate({
                                                        id: c.id,
                                                        action: "stop",
                                                    })}
                                            >
                                                <SquareIcon class="size-3" />
                                            </Button>
                                        {:else}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                class="size-7"
                                                disabled={actionMutation.isPending &&
                                                    actionMutation.variables
                                                        ?.id === c.id}
                                                onclick={() =>
                                                    actionMutation.mutate({
                                                        id: c.id,
                                                        action: "start",
                                                    })}
                                            >
                                                <PlayIcon class="size-3" />
                                            </Button>
                                        {/if}
                                        <a href="/dashboard/containers/{c.id}">
                                            <ChevronRightIcon
                                                class="size-4 text-muted-foreground"
                                            />
                                        </a>
                                    </div>
                                </div>
                            {/each}
                            {#if containers.length > 8}
                                <div class="px-5 py-2.5">
                                    <a
                                        href="/dashboard/containers"
                                        class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                                    >
                                        +{containers.length - 8} more <ChevronRightIcon
                                            class="size-3"
                                        />
                                    </a>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>

                <!-- Recent Activity from Notifications -->
                {#if notifications.length > 0}
                    <div class="bg-card border rounded-xl overflow-hidden">
                        <div
                            class="flex items-center justify-between px-5 py-3.5 border-b"
                        >
                            <div class="flex items-center gap-2">
                                <h2 class="font-medium text-sm">
                                    Recent Activity
                                </h2>
                                {#if notifications.filter((n) => n.acknowledged_at === null).length > 0}
                                    <span
                                        class="text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5 flex items-center gap-1"
                                    >
                                        <CircleAlert class="size-3" />
                                        {notifications.filter(
                                            (n) => n.acknowledged_at === null,
                                        ).length} unread
                                    </span>
                                {/if}
                            </div>
                            <a
                                href="/dashboard/monitoring"
                                class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                            >
                                View all <ChevronRightIcon class="size-3" />
                            </a>
                        </div>
                        <div class="divide-y">
                            {#each notifications as n (n.id)}
                                <div
                                    class="px-5 py-3 flex items-start gap-3 {n.acknowledged_at ===
                                    null
                                        ? 'bg-muted/20'
                                        : ''}"
                                >
                                    <div class="mt-1 shrink-0">
                                        <CircleIcon
                                            class="size-1.5 fill-current {severityColor(
                                                n.severity,
                                            )}"
                                            style="color: {severityDot(
                                                n.severity,
                                            )}"
                                        />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div
                                            class="flex items-center gap-2 min-w-0"
                                        >
                                            <span
                                                class="text-xs font-medium truncate {n.acknowledged_at ===
                                                null
                                                    ? ''
                                                    : 'text-muted-foreground'}"
                                            >
                                                {n.container_name || "system"}
                                            </span>
                                            <span
                                                class="text-xs text-muted-foreground shrink-0"
                                                >{timeAgo(n.updated_at)}</span
                                            >
                                        </div>
                                        <p
                                            class="text-xs text-muted-foreground truncate mt-0.5"
                                        >
                                            {n.message}
                                        </p>
                                    </div>
                                    {#if n.occurrence_count > 1}
                                        <span
                                            class="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0 tabular-nums"
                                        >
                                            ×{n.occurrence_count}
                                        </span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>

            <!-- Right: Resources -->
            <div class="space-y-5">
                <div
                    class="bg-card border rounded-xl overflow-hidden {hasResourceWarning
                        ? 'border-amber-500/20'
                        : ''}"
                >
                    <div
                        class="flex items-center justify-between px-5 py-3.5 border-b"
                    >
                        <div class="flex items-center gap-2">
                            <h2 class="font-medium text-sm">Resources</h2>
                            {#if hasResourceWarning}
                                <CircleAlert class="size-3.5 text-amber-500" />
                            {/if}
                        </div>
                        <a
                            href="/dashboard/monitoring"
                            class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                            Monitor <ChevronRightIcon class="size-3" />
                        </a>
                    </div>
                    <div class="p-5 space-y-4">
                        {#each [{ label: "CPU", icon: CpuIcon, value: cpuPct, text: cpuPct > 0 ? `${cpuPct.toFixed(1)}%` : "—", tooltip: "Current CPU usage of the host machine" }, { label: "Memory", icon: ActivityIcon, value: memPct, text: memPct > 0 ? `${memPct.toFixed(1)}%` : "—", tooltip: "RAM usage — high usage can slow down containers" }, { label: "Disk", icon: HardDriveIcon, value: diskPct, text: diskPct > 0 ? `${diskPct.toFixed(1)}%` : "—", tooltip: "Disk space used — images and volumes consume storage" }] as metric}
                            <Tooltip.Provider delayDuration={300}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger class="w-full text-left">
                                        <div>
                                            <div
                                                class="flex items-center justify-between mb-1.5"
                                            >
                                                <div
                                                    class="flex items-center gap-1.5 text-xs text-muted-foreground"
                                                >
                                                    <metric.icon
                                                        class="size-3"
                                                    />
                                                    {metric.label}
                                                </div>
                                                <span
                                                    class="text-xs font-medium tabular-nums {!metrics
                                                        ? 'text-muted-foreground'
                                                        : resourceTextColor(
                                                              metric.value,
                                                          )}"
                                                >
                                                    {!metrics
                                                        ? "—"
                                                        : metric.text}
                                                </span>
                                            </div>
                                            <div
                                                class="h-1 bg-muted rounded-full overflow-hidden"
                                            >
                                                {#if metrics}
                                                    <div
                                                        class="h-full rounded-full transition-all duration-700 {resourceBarColor(
                                                            metric.value,
                                                        )}"
                                                        style="width: {Math.min(
                                                            metric.value,
                                                            100,
                                                        )}%"
                                                    ></div>
                                                {/if}
                                            </div>
                                        </div>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content class="text-xs max-w-40"
                                        >{metric.tooltip}</Tooltip.Content
                                    >
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        {/each}
                    </div>
                </div>
            </div>
        </div>
    {/if}
</div>
