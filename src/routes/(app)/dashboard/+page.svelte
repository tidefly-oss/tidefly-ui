<script lang="ts">
    import type { ContainerStatus } from "$lib/api/v1/types";
    import { containersApi } from "$lib/api/v1/containers";
    import { deployApi } from "$lib/api/v1/deploy";
    import { imagesApi } from "$lib/api/v1/images";
    import { networksApi } from "$lib/api/v1/networks";
    import { systemApi } from "$lib/api/v1/system";
    import { volumesApi } from "$lib/api/v1/volumes";
    import { dockerEventsStore } from "$lib/stores/events.svelte.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import {
        ActivityIcon, BoxIcon, ChevronRightIcon, CircleAlert,
        CircleIcon, CodeIcon, ContainerIcon, CpuIcon,
        DatabaseIcon, GitBranchIcon, HardDriveIcon, ImageIcon,
        LayersIcon, NetworkIcon, PlayIcon, PlusIcon,
        ServerIcon, SquareIcon, ZapIcon,
    } from "@lucide/svelte";
    import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
    import { onDestroy, onMount } from "svelte";

    const qc = useQueryClient();

    // ── Queries ───────────────────────────────────────────────────────────────
    const containersQuery = createQuery(() => ({
        queryKey: ["containers"],
        queryFn: () => containersApi.list(true),
        refetchInterval: 15_000,
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
    const servicesQuery = createQuery(() => ({
        queryKey: ["services"],
        queryFn: () => deployApi.list(),
        refetchInterval: 15_000,
    }));
    const systemQuery = createQuery(() => ({
        queryKey: ["system-overview"],
        queryFn: () => systemApi.overview(),
        refetchInterval: 10_000,
    }));

    // ── Mutations ─────────────────────────────────────────────────────────────
    const actionMutation = createMutation(() => ({
        mutationFn: ({ id, action }: { id: string; action: "start" | "stop" }) =>
            action === "start" ? containersApi.start(id) : containersApi.stop(id),
        onSuccess: (_, { id, action }) => {
            const status: ContainerStatus = action === "start" ? "running" : "exited";
            qc.setQueryData<{ id: string; status: ContainerStatus }[]>(
                ["containers"],
                (old) => old?.map((c) => (c.id === id ? { ...c, status } : c)) ?? [],
            );
        },
    }));

    // ── Derived ───────────────────────────────────────────────────────────────
    const containers  = $derived(containersQuery.data ?? []);
    const images      = $derived(imagesQuery.data ?? []);
    const networks    = $derived(networksQuery.data ?? []);
    const volumes     = $derived(volumesQuery.data ?? []);
    const services    = $derived(servicesQuery.data ?? []);
    const overview    = $derived(systemQuery.data ?? null);

    const runningCount   = $derived(containers.filter((c) => c.status === "running").length);
    const stoppedCount   = $derived(containers.filter((c) => c.status !== "running").length);
    const failedServices = $derived(services.filter((s) => s.status === "failed").length);
    const runningServices = $derived(services.filter((s) => s.status === "running").length);

    const cpuPct  = $derived(overview?.resources.cpu_percent ?? 0);
    const memPct  = $derived(overview?.resources.memory.percent ?? 0);
    const diskPct = $derived(overview?.resources.disk.percent ?? 0);

    const hasResourceWarning = $derived(cpuPct > 80 || memPct > 80 || diskPct > 85);
    const systemHealthy = $derived(!hasResourceWarning && failedServices === 0);

    const isEmpty = $derived(
        !containersQuery.isPending &&
        !servicesQuery.isPending &&
        containers.length === 0 &&
        services.length === 0,
    );

    // ── Docker Events ─────────────────────────────────────────────────────────
    onMount(() => dockerEventsStore.connect());
    onDestroy(() => dockerEventsStore.disconnect());

    // ── Helpers ───────────────────────────────────────────────────────────────
    function statusColor(status: ContainerStatus) {
        const m: Record<ContainerStatus, string> = {
            running: "#22c55e", stopped: "#6b7280", exited: "#6b7280",
            paused: "#f59e0b", created: "#3b82f6",
        };
        return m[status] ?? "#6b7280";
    }

    function formatBytes(mb: number) {
        return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
    }

    function resourceBarColor(pct: number) {
        return pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-primary";
    }

    function resourceTextColor(pct: number) {
        return pct > 80 ? "text-destructive" : pct > 60 ? "text-amber-500" : "text-foreground";
    }

    const serviceStatusColor: Record<string, string> = {
        running: "#22c55e", deploying: "#3b82f6", stopped: "#6b7280", failed: "#ef4444",
    };

    const quickActions = [
        { icon: DatabaseIcon, title: "Deploy a Service", description: "Redis, Postgres, and more", href: "/dashboard/services/templates", accent: "bg-blue-500/10 text-blue-500" },
        { icon: CodeIcon, title: "Dockerfile", description: "Build and run a custom container", href: "/dashboard/containers?action=dockerfile", accent: "bg-violet-500/10 text-violet-500" },
        { icon: LayersIcon, title: "Docker Compose", description: "Deploy a compose stack", href: "/dashboard/containers?action=compose", accent: "bg-orange-500/10 text-orange-500" },
        { icon: GitBranchIcon, title: "Connect Git", description: "Auto-deploy on push", href: "/dashboard/git", accent: "bg-green-500/10 text-green-500" },
    ];
</script>

<div class="space-y-5">

    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>
            <!-- System health pill -->
            <Tooltip.Provider delayDuration={200}>
                <Tooltip.Root>
                    <Tooltip.Trigger>
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border
              {systemHealthy
                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-500'}">
              <span class="size-1.5 rounded-full {systemHealthy ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}"></span>
                {systemHealthy ? "All systems healthy" : "Needs attention"}
            </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="text-xs">
                        {#if failedServices > 0}
                            {failedServices} service{failedServices > 1 ? "s" : ""} failed ·
                        {/if}
                        {#if cpuPct > 80}CPU {cpuPct.toFixed(0)}% · {/if}
                        {#if memPct > 80}Memory {memPct.toFixed(0)}% · {/if}
                        {#if diskPct > 85}Disk {diskPct.toFixed(0)}%{/if}
                        {#if systemHealthy}No issues detected{/if}
                    </Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        </div>

        <!-- Quick action buttons for power users -->
        <div class="flex items-center gap-2">
            <a href="/dashboard/services/templates">
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

    <!-- ── Stat Cards ─────────────────────────────────────────────────────── -->
    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {#each [
            {
                href: "/dashboard/containers",
                icon: ContainerIcon,
                query: containersQuery,
                value: containers.length,
                label: "Containers",
                sub: containers.length > 0
                    ? `${runningCount} running${stoppedCount > 0 ? ` · ${stoppedCount} stopped` : ""}`
                    : "None running",
                bar: containers.length > 0 ? runningCount / containers.length : null,
                alert: false,
            },
            {
                href: "/dashboard/services",
                icon: ServerIcon,
                query: servicesQuery,
                value: services.length,
                label: "Services",
                sub: failedServices > 0 ? `${failedServices} failed` : services.length > 0 ? `${runningServices} running` : "None deployed",
                bar: null,
                alert: failedServices > 0,
            },
            {
                href: "/dashboard/images",
                icon: ImageIcon,
                query: imagesQuery,
                value: images.length,
                label: "Images",
                sub: "Local registry",
                bar: null,
                alert: false,
            },
            {
                href: "/dashboard/volumes",
                icon: BoxIcon,
                query: volumesQuery,
                value: volumes.length,
                label: "Volumes",
                sub: "Persistent storage",
                bar: null,
                alert: false,
            },
            {
                href: "/dashboard/networks",
                icon: NetworkIcon,
                query: networksQuery,
                value: networks.length,
                label: "Networks",
                sub: "Project isolation",
                bar: null,
                alert: false,
            },
        ] as card}
            <a
                    href={card.href}
                    class="bg-card border rounded-xl p-4 hover:border-primary/40 transition-all group
                        {card.alert ? 'border-destructive/30 bg-destructive/5' : ''}"
            >
                <div class="flex items-start justify-between mb-3">
                    <div class="bg-muted rounded-lg p-1.5 {card.alert ? 'bg-destructive/10' : ''}">
                        <card.icon class="size-3.5 {card.alert ? 'text-destructive' : 'text-muted-foreground'}" />
                    </div>
                    <ChevronRightIcon class="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {#if card.query.isPending}
                    <div class="h-7 bg-muted rounded animate-pulse w-10 mb-1"></div>
                    <div class="h-3 bg-muted rounded animate-pulse w-20"></div>
                {:else}
                    <div class="text-2xl font-bold tabular-nums {card.alert ? 'text-destructive' : ''}">{card.value}</div>
                    <div class="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                    {#if card.bar !== null}
                        <div class="flex gap-0.5 h-0.5 rounded-full overflow-hidden mt-2.5 bg-muted">
                            <div class="bg-green-500 transition-all" style="width: {card.bar * 100}%"></div>
                        </div>
                    {/if}
                    <div class="text-xs mt-1.5 {card.alert ? 'text-destructive' : 'text-muted-foreground'}">{card.sub}</div>
                {/if}
            </a>
        {/each}
    </div>

    <!-- ── Empty State ────────────────────────────────────────────────────── -->
    {#if isEmpty}
        <div class="bg-card border rounded-xl p-8">
            <div class="max-w-auto mx-auto">
                <div class="flex items-center gap-2 mb-3">
                    <ZapIcon class="size-4 text-primary" />
                    <span class="text-sm font-medium">Getting started</span>
                </div>
                <h2 class="text-xl font-semibold mb-1">Nothing deployed yet</h2>
                <p class="text-sm text-muted-foreground mb-6">
                    Deploy a service, run a container, or connect a Git repository to get started.
                </p>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {#each quickActions as action, i}
                        <a
                                href={action.href}
                                class="flex items-start gap-3 rounded-lg border p-3.5 hover:border-primary/40 hover:bg-muted/30 transition-all group
                {i === 0 ? 'border-primary/20 bg-primary/5' : ''}"
                        >
                            <div class="rounded-lg p-2 shrink-0 {action.accent}">
                                <action.icon class="size-4" />
                            </div>
                            <div class="min-w-0">
                                <div class="text-sm font-medium group-hover:text-primary transition-colors flex items-center gap-1.5">
                                    {action.title}
                                    {#if i === 0}<span class="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Recommended</span>{/if}
                                </div>
                                <div class="text-xs text-muted-foreground mt-0.5">{action.description}</div>
                            </div>
                        </a>
                    {/each}
                </div>
            </div>
        </div>

    {:else}
        <!-- ── Main Content Grid ──────────────────────────────────────────────── -->
        <div class="grid gap-5 lg:grid-cols-3">

            <!-- Left col: Containers + Services (2/3 width) -->
            <div class="lg:col-span-2 space-y-5">

                <!-- Containers -->
                <div class="bg-card border rounded-xl overflow-hidden">
                    <div class="flex items-center justify-between px-5 py-3.5 border-b">
                        <div class="flex items-center gap-2">
                            <h2 class="font-medium text-sm">Containers</h2>
                            {#if !containersQuery.isPending && containers.length > 0}
                <span class="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
                  {runningCount}/{containers.length}
                </span>
                            {/if}
                        </div>
                        <a href="/dashboard/containers" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            View all <ChevronRightIcon class="size-3" />
                        </a>
                    </div>
                    <div class="divide-y">
                        {#if containersQuery.isPending}
                            {#each Array(3) as _, i (i)}
                                <div class="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                                    <div class="size-2 rounded-full bg-muted shrink-0"></div>
                                    <div class="flex-1 space-y-1.5">
                                        <div class="h-3.5 bg-muted rounded w-32"></div>
                                        <div class="h-3 bg-muted rounded w-48"></div>
                                    </div>
                                </div>
                            {/each}
                        {:else if containers.length === 0}
                            <div class="px-5 py-8 flex flex-col items-center gap-3 text-center">
                                <ContainerIcon class="size-7 text-muted-foreground/40" />
                                <span class="text-sm text-muted-foreground">No containers running</span>
                                <a href="/dashboard/containers?action=dockerfile">
                                    <Button size="sm" variant="outline"><PlusIcon class="size-3.5 mr-1.5" />Run Container</Button>
                                </a>
                            </div>
                        {:else}
                            {#each containers.slice(0, 7) as c (c.id)}
                                <div class="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors group">
                                    <CircleIcon class="size-2 shrink-0 fill-current" style="color: {statusColor(c.status)}" />
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="text-sm font-medium truncate">{c.name}</span>
                                            <span class="text-xs text-muted-foreground font-mono truncate hidden sm:block max-w-48">{c.image}</span>
                                        </div>
                                        <div class="text-xs text-muted-foreground capitalize mt-0.5">{c.status}</div>
                                    </div>
                                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                        {#if c.status === "running"}
                                            <Button variant="ghost" size="icon" class="size-7"
                                                    disabled={actionMutation.isPending && actionMutation.variables?.id === c.id}
                                                    onclick={() => actionMutation.mutate({ id: c.id, action: "stop" })}>
                                                <SquareIcon class="size-3" />
                                            </Button>
                                        {:else}
                                            <Button variant="ghost" size="icon" class="size-7"
                                                    disabled={actionMutation.isPending && actionMutation.variables?.id === c.id}
                                                    onclick={() => actionMutation.mutate({ id: c.id, action: "start" })}>
                                                <PlayIcon class="size-3" />
                                            </Button>
                                        {/if}
                                        <a href="/dashboard/containers/{c.id}">
                                            <ChevronRightIcon class="size-4 text-muted-foreground" />
                                        </a>
                                    </div>
                                </div>
                            {/each}
                            {#if containers.length > 7}
                                <div class="px-5 py-2.5 border-t">
                                    <a href="/dashboard/containers" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                        +{containers.length - 7} more <ChevronRightIcon class="size-3" />
                                    </a>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>

                <!-- Services -->
                <div class="bg-card border rounded-xl overflow-hidden {failedServices > 0 ? 'border-destructive/30' : ''}">
                    <div class="flex items-center justify-between px-5 py-3.5 border-b">
                        <div class="flex items-center gap-2">
                            <h2 class="font-medium text-sm">Services</h2>
                            {#if failedServices > 0}
                <span class="text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5 flex items-center gap-1">
                  <CircleAlert class="size-3" />{failedServices} failed
                </span>
                            {/if}
                        </div>
                        <a href="/dashboard/services/templates" class="flex items-center gap-1 text-xs text-primary hover:underline">
                            <PlusIcon class="size-3" /> Deploy
                        </a>
                    </div>
                    <div class="divide-y">
                        {#if servicesQuery.isPending}
                            {#each Array(3) as _, i (i)}
                                <div class="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                                    <div class="size-7 rounded-md bg-muted shrink-0"></div>
                                    <div class="flex-1 space-y-1.5">
                                        <div class="h-3.5 bg-muted rounded w-28"></div>
                                        <div class="h-3 bg-muted rounded w-16"></div>
                                    </div>
                                </div>
                            {/each}
                        {:else if services.length === 0}
                            <div class="px-5 py-8 flex flex-col items-center gap-3 text-center">
                                <DatabaseIcon class="size-7 text-muted-foreground/40" />
                                <span class="text-sm text-muted-foreground">No services deployed yet</span>
                                <a href="/dashboard/services/templates">
                                    <Button size="sm" variant="outline"><PlusIcon class="size-3.5 mr-1.5" />Deploy Service</Button>
                                </a>
                            </div>
                        {:else}
                            {#each services.slice(0, 5) as s (s.id)}
                                <a href="/dashboard/services"
                                   class="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors group">
                                    <div class="bg-muted rounded-md p-1.5 shrink-0">
                                        <DatabaseIcon class="size-3.5 text-muted-foreground" />
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <span class="text-sm font-medium truncate block">{s.name}</span>
                                        <div class="flex items-center gap-1.5 mt-0.5">
                                            <CircleIcon class="size-1.5 fill-current shrink-0" style="color: {serviceStatusColor[s.status] ?? '#6b7280'}" />
                                            <span class="text-xs text-muted-foreground truncate">{s.template_slug} · {s.version}</span>
                                        </div>
                                    </div>
                                    <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                </a>
                            {/each}
                            {#if services.length > 5}
                                <div class="px-5 py-2.5 border-t">
                                    <a href="/dashboard/services" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                        +{services.length - 5} more <ChevronRightIcon class="size-3" />
                                    </a>
                                </div>
                            {/if}
                        {/if}
                    </div>
                </div>
            </div>

            <!-- Right col: System Resources + Quick Actions (1/3 width) -->
            <div class="space-y-5">

                <!-- System Resources -->
                <div class="bg-card border rounded-xl overflow-hidden {hasResourceWarning ? 'border-amber-500/20' : ''}">
                    <div class="flex items-center justify-between px-5 py-3.5 border-b">
                        <div class="flex items-center gap-2">
                            <h2 class="font-medium text-sm">Resources</h2>
                            {#if hasResourceWarning}
                                <CircleAlert class="size-3.5 text-amber-500" />
                            {/if}
                        </div>
                        <a href="/dashboard/monitoring" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                            Monitor <ChevronRightIcon class="size-3" />
                        </a>
                    </div>
                    <div class="p-5 space-y-4">
                        {#each [
                            { label: "CPU", icon: CpuIcon, value: cpuPct, format: (v: number) => `${v.toFixed(1)}%` },
                            { label: "Memory", icon: ActivityIcon, value: memPct,
                                format: () => overview ? `${formatBytes(overview.resources.memory.used_mb)} / ${formatBytes(overview.resources.memory.total_mb)}` : "—" },
                            { label: "Disk", icon: HardDriveIcon, value: diskPct,
                                format: () => overview ? `${formatBytes(overview.resources.disk.used_mb)} / ${formatBytes(overview.resources.disk.total_mb)}` : "—" },
                        ] as metric}
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <metric.icon class="size-3" />
                                        {metric.label}
                                    </div>
                                    <span class="text-xs font-medium tabular-nums {systemQuery.isPending ? 'text-muted-foreground' : resourceTextColor(metric.value)}">
                    {systemQuery.isPending ? "—" : metric.format(metric.value)}
                  </span>
                                </div>
                                <div class="h-1 bg-muted rounded-full overflow-hidden">
                                    {#if !systemQuery.isPending && overview}
                                        <div class="h-full rounded-full transition-all duration-700 {resourceBarColor(metric.value)}"
                                             style="width: {Math.min(metric.value, 100)}%"></div>
                                    {:else}
                                        <div class="h-full bg-muted rounded-full w-0"></div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>

                <!-- Quick Actions — always visible for power users -->
                <div class="bg-card border rounded-xl overflow-hidden">
                    <div class="px-5 py-3.5 border-b">
                        <h2 class="font-medium text-sm">Quick Actions</h2>
                    </div>
                    <div class="p-3 space-y-1">
                        {#each quickActions as action}
                            <a
                                    href={action.href}
                                    class="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors group"
                            >
                                <div class="rounded-md p-1.5 shrink-0 {action.accent}">
                                    <action.icon class="size-3.5" />
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="text-sm font-medium group-hover:text-primary transition-colors">{action.title}</div>
                                    <div class="text-xs text-muted-foreground">{action.description}</div>
                                </div>
                                <ChevronRightIcon class="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                        {/each}
                    </div>
                </div>

                <!-- Storage snapshot -->
                <div class="bg-card border rounded-xl p-4">
                    <div class="flex items-center justify-between mb-3">
                        <h2 class="font-medium text-sm">Storage</h2>
                        <span class="text-xs text-muted-foreground tabular-nums">
              {images.length} images · {volumes.length} volumes
            </span>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <a href="/dashboard/images" class="flex items-center gap-2 rounded-lg border p-2.5 hover:border-primary/30 hover:bg-muted/30 transition-all group">
                            <ImageIcon class="size-3.5 text-muted-foreground" />
                            <div>
                                <div class="text-sm font-medium tabular-nums">{imagesQuery.isPending ? "—" : images.length}</div>
                                <div class="text-xs text-muted-foreground">Images</div>
                            </div>
                        </a>
                        <a href="/dashboard/volumes" class="flex items-center gap-2 rounded-lg border p-2.5 hover:border-primary/30 hover:bg-muted/30 transition-all group">
                            <BoxIcon class="size-3.5 text-muted-foreground" />
                            <div>
                                <div class="text-sm font-medium tabular-nums">{volumesQuery.isPending ? "—" : volumes.length}</div>
                                <div class="text-xs text-muted-foreground">Volumes</div>
                            </div>
                        </a>
                    </div>
                </div>

            </div>
        </div>
    {/if}
</div>