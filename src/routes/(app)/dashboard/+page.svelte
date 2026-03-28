<script lang="ts">
	import type { ContainerStatus } from "$lib/api/v1/types";
	import { containersApi } from "$lib/api/v1/containers";
	import { deployApi } from "$lib/api/v1/deploy";
	import { imagesApi } from "$lib/api/v1/images";
	import { networksApi } from "$lib/api/v1/networks";
	import { systemApi } from "$lib/api/v1/system";
	import { volumesApi } from "$lib/api/v1/volumes";
	import { Button } from "$lib/components/ui/button/index.js";
    import DashboardEmptyState from "$lib/components/dashboard/Dashboardemptystate.svelte";
	import {
		ActivityIcon,
		CircleAlert,
		BoxIcon,
		ChevronRightIcon,
		CircleIcon,
		ContainerIcon,
		CpuIcon,
		DatabaseIcon,
		HardDriveIcon,
		ImageIcon,
		NetworkIcon,
		PlayIcon,
		PlusIcon,
		ServerIcon,
		SquareIcon,
	} from "@lucide/svelte";
	import {
		createMutation,
		createQuery,
		useQueryClient,
	} from "@tanstack/svelte-query";

	const qc = useQueryClient();

	const containersQuery = createQuery(() => ({
		queryKey: ["containers"],
		queryFn: () => containersApi.list(true),
		refetchInterval: 15_000,
	}));
	const imagesQuery = createQuery(() => ({
		queryKey: ["images"],
		queryFn: () => imagesApi.list(),
	}));
	const networksQuery = createQuery(() => ({
		queryKey: ["networks"],
		queryFn: () => networksApi.list(),
	}));
	const volumesQuery = createQuery(() => ({
		queryKey: ["volumes"],
		queryFn: () => volumesApi.list(),
	}));
	const servicesQuery = createQuery(() => ({
		queryKey: ["services"],
		queryFn: () => deployApi.list(),
	}));
	const systemQuery = createQuery(() => ({
		queryKey: ["system-overview"],
		queryFn: () => systemApi.overview(),
		refetchInterval: 10_000,
	}));

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

	const containers = $derived(containersQuery.data ?? []);
	const images = $derived(imagesQuery.data ?? []);
	const networks = $derived(networksQuery.data ?? []);
	const volumes = $derived(volumesQuery.data ?? []);
	const services = $derived(servicesQuery.data ?? []);
	const overview = $derived(systemQuery.data ?? null);

	const runningCount = $derived(containers.filter((c: any) => c.status === "running").length);
	const stoppedCount = $derived(containers.filter((c: any) => c.status !== "running").length);
	const failedServices = $derived(services.filter((s: any) => s.status === "failed").length);

	const isEmpty = $derived(
		!containersQuery.isPending &&
		!servicesQuery.isPending &&
		containers.length === 0 &&
		services.length === 0,
	);

	const cpuPct = $derived(overview?.resources.cpu_percent ?? 0);
	const memPct = $derived(overview?.resources.memory.percent ?? 0);
	const diskPct = $derived(overview?.resources.disk.percent ?? 0);
	const hasResourceWarning = $derived(cpuPct > 80 || memPct > 80 || diskPct > 85);

	function statusColor(status: ContainerStatus) {
		const colors: Record<ContainerStatus, string> = {
			running: "#22c55e", stopped: "#6b7280", exited: "#6b7280", paused: "#f59e0b", created: "#3b82f6",
		};
		return colors[status] ?? "#6b7280";
	}

	function formatBytes(mb: number) {
		return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
	}

	function resourceBarColor(pct: number) {
		return pct > 80 ? "bg-red-500" : pct > 60 ? "bg-amber-500" : "bg-green-500";
	}

	function resourceTextColor(pct: number) {
		return pct > 80 ? "text-red-500" : pct > 60 ? "text-amber-500" : "text-foreground";
	}

	const serviceStatusColor: Record<string, string> = {
		running: "#22c55e", deploying: "#3b82f6", stopped: "#6b7280", failed: "#ef4444",
	};
</script>

<div class="space-y-6">

    <!-- Stat Cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <a href="/dashboard/containers"
           class="col-span-2 lg:col-span-1 bg-card border rounded-xl p-5 hover:border-primary/40 transition-all group">
            <div class="flex items-start justify-between">
                <div class="bg-muted rounded-lg p-2"><ContainerIcon class="size-4 text-muted-foreground" /></div>
                <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {#if containersQuery.isPending}
                <div class="mt-3 h-8 bg-muted rounded animate-pulse w-12 mb-2"></div>
                <div class="h-3 bg-muted rounded animate-pulse w-24"></div>
            {:else}
                <div class="mt-3 text-3xl font-bold tabular-nums">{containers.length}</div>
                <div class="text-muted-foreground text-xs mt-0.5 mb-3">Containers</div>
                {#if containers.length > 0}
                    <div class="flex gap-0.5 h-1 rounded-full overflow-hidden mb-2">
                        <div class="bg-green-500 transition-all" style="width: {(runningCount / containers.length) * 100}%"></div>
                        <div class="bg-muted flex-1"></div>
                    </div>
                    <div class="flex gap-3">
            <span class="text-xs text-green-500 flex items-center gap-1">
              <CircleIcon class="size-1.5 fill-current" />{runningCount} running
            </span>
                        {#if stoppedCount > 0}
              <span class="text-xs text-muted-foreground flex items-center gap-1">
                <CircleIcon class="size-1.5 fill-current" />{stoppedCount} stopped
              </span>
                        {/if}
                    </div>
                {:else}
                    <span class="text-xs text-muted-foreground">None running</span>
                {/if}
            {/if}
        </a>

        <a href="/dashboard/services"
           class="bg-card border rounded-xl p-5 hover:border-primary/40 transition-all group">
            <div class="flex items-start justify-between">
                <div class="bg-muted rounded-lg p-2"><ServerIcon class="size-4 text-muted-foreground" /></div>
                <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {#if servicesQuery.isPending}
                <div class="mt-3 h-8 bg-muted rounded animate-pulse w-12 mb-2"></div>
                <div class="h-3 bg-muted rounded animate-pulse w-16"></div>
            {:else}
                <div class="mt-3 text-3xl font-bold tabular-nums">{services.length}</div>
                <div class="text-muted-foreground text-xs mt-0.5 mb-3">Services</div>
                {#if failedServices > 0}
          <span class="text-xs text-red-500 flex items-center gap-1">
            <CircleAlert class="size-3" />{failedServices} failed
          </span>
                {:else if services.length > 0}
          <span class="text-xs text-green-500 flex items-center gap-1">
            <CircleIcon class="size-1.5 fill-current" />{services.filter((s: any) => s.status === "running").length} running
          </span>
                {:else}
                    <span class="text-xs text-muted-foreground">None deployed</span>
                {/if}
            {/if}
        </a>

        <a href="/dashboard/images"
           class="bg-card border rounded-xl p-5 hover:border-primary/40 transition-all group">
            <div class="flex items-start justify-between">
                <div class="bg-muted rounded-lg p-2"><ImageIcon class="size-4 text-muted-foreground" /></div>
                <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {#if imagesQuery.isPending}
                <div class="mt-3 h-8 bg-muted rounded animate-pulse w-12 mb-2"></div>
                <div class="h-3 bg-muted rounded animate-pulse w-14"></div>
            {:else}
                <div class="mt-3 text-3xl font-bold tabular-nums">{images.length}</div>
                <div class="text-muted-foreground text-xs mt-0.5 mb-3">Images</div>
                <span class="text-xs text-muted-foreground">Local registry</span>
            {/if}
        </a>

        <a href="/dashboard/volumes"
           class="bg-card border rounded-xl p-5 hover:border-primary/40 transition-all group">
            <div class="flex items-start justify-between">
                <div class="bg-muted rounded-lg p-2"><BoxIcon class="size-4 text-muted-foreground" /></div>
                <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {#if volumesQuery.isPending}
                <div class="mt-3 h-8 bg-muted rounded animate-pulse w-12 mb-2"></div>
                <div class="h-3 bg-muted rounded animate-pulse w-14"></div>
            {:else}
                <div class="mt-3 text-3xl font-bold tabular-nums">{volumes.length}</div>
                <div class="text-muted-foreground text-xs mt-0.5 mb-3">Volumes</div>
                <span class="text-xs text-muted-foreground">Persistent storage</span>
            {/if}
        </a>

        <a href="/dashboard/networks"
           class="bg-card border rounded-xl p-5 hover:border-primary/40 transition-all group">
            <div class="flex items-start justify-between">
                <div class="bg-muted rounded-lg p-2"><NetworkIcon class="size-4 text-muted-foreground" /></div>
                <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {#if networksQuery.isPending}
                <div class="mt-3 h-8 bg-muted rounded animate-pulse w-12 mb-2"></div>
                <div class="h-3 bg-muted rounded animate-pulse w-14"></div>
            {:else}
                <div class="mt-3 text-3xl font-bold tabular-nums">{networks.length}</div>
                <div class="text-muted-foreground text-xs mt-0.5 mb-3">Networks</div>
                <span class="text-xs text-muted-foreground">Project isolation</span>
            {/if}
        </a>
    </div>

    {#if isEmpty}
        <DashboardEmptyState />
    {:else}
        <!-- 2-col grid: Containers + Services | System Resources -->
        <div class="grid gap-6 lg:grid-cols-2">

            <!-- Containers -->
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4 border-b">
                    <div class="flex items-center gap-2">
                        <h2 class="font-medium text-sm">Containers</h2>
                        {#if !containersQuery.isPending && containers.length > 0}
              <span class="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 tabular-nums">
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
                            <div class="px-5 py-4 flex items-center gap-3 animate-pulse">
                                <div class="size-2 rounded-full bg-muted shrink-0"></div>
                                <div class="flex-1 space-y-1.5">
                                    <div class="h-3.5 bg-muted rounded w-32"></div>
                                    <div class="h-3 bg-muted rounded w-48"></div>
                                </div>
                            </div>
                        {/each}
                    {:else if containers.length === 0}
                        <div class="px-5 py-8 flex flex-col items-center gap-3 text-center">
                            <span class="text-sm text-muted-foreground">No containers yet</span>
                            <a href="/dashboard/containers?action=dockerfile">
                                <Button size="sm" variant="outline"><PlusIcon class="size-3.5 mr-1.5" />Deploy Container</Button>
                            </a>
                        </div>
                    {:else}
                        {#each containers.slice(0, 6) as c (c.id)}
                            <div class="px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors group">
                                <CircleIcon class="size-2 shrink-0 fill-current" style="color: {statusColor(c.status)}" />
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm font-medium truncate">{c.name}</span>
                                        <span class="text-xs text-muted-foreground truncate hidden sm:block">{c.image}</span>
                                    </div>
                                    <div class="text-xs text-muted-foreground mt-0.5 capitalize">{c.status}</div>
                                </div>
                                <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                        {#if containers.length > 6}
                            <div class="px-5 py-3">
                                <a href="/dashboard/containers" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    +{containers.length - 6} more <ChevronRightIcon class="size-3" />
                                </a>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- Services -->
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="flex items-center justify-between px-5 py-4 border-b">
                    <div class="flex items-center gap-2">
                        <h2 class="font-medium text-sm">Services</h2>
                        {#if failedServices > 0}
              <span class="text-xs text-red-500 bg-red-500/10 rounded-full px-1.5 py-0.5 flex items-center gap-1">
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
                            <div class="px-5 py-4 flex items-center gap-3 animate-pulse">
                                <div class="size-7 rounded-md bg-muted shrink-0"></div>
                                <div class="flex-1 space-y-1.5">
                                    <div class="h-3.5 bg-muted rounded w-28"></div>
                                    <div class="h-3 bg-muted rounded w-16"></div>
                                </div>
                            </div>
                        {/each}
                    {:else if services.length === 0}
                        <div class="px-5 py-8 flex flex-col items-center gap-3 text-center">
                            <span class="text-sm text-muted-foreground">No services deployed yet</span>
                            <a href="/dashboard/services/templates">
                                <Button size="sm" variant="outline"><PlusIcon class="size-3.5 mr-1.5" />Deploy Service</Button>
                            </a>
                        </div>
                    {:else}
                        {#each services.slice(0, 6) as s (s.id)}
                            <a href="/dashboard/services"
                               class="px-5 py-4 flex items-center gap-3 hover:bg-muted/30 transition-colors group block">
                                <div class="bg-muted rounded-md p-1.5 shrink-0">
                                    <DatabaseIcon class="size-3.5 text-muted-foreground" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <span class="text-sm font-medium truncate block">{s.name}</span>
                                    <div class="flex items-center gap-1 mt-0.5">
                                        <CircleIcon class="size-1.5 fill-current" style="color: {serviceStatusColor[s.status]}" />
                                        <span class="text-xs text-muted-foreground">{s.template_slug} · {s.version}</span>
                                    </div>
                                </div>
                                <ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                        {/each}
                        {#if services.length > 6}
                            <div class="px-5 py-3">
                                <a href="/dashboard/services" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                                    +{services.length - 6} more <ChevronRightIcon class="size-3" />
                                </a>
                            </div>
                        {/if}
                    {/if}
                </div>
            </div>
        </div>

        <!-- System Resources: full width, horizontal -->
        <div class="bg-card border rounded-xl overflow-hidden {hasResourceWarning ? 'border-amber-500/30' : ''}">
            <div class="flex items-center justify-between px-5 py-4 border-b">
                <div class="flex items-center gap-2">
                    <h2 class="font-medium text-sm">System Resources</h2>
                    {#if hasResourceWarning}
                        <CircleAlert class="size-3.5 text-amber-500" />
                    {/if}
                </div>
                <a href="/dashboard/monitoring" class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    Full Monitoring <ChevronRightIcon class="size-3" />
                </a>
            </div>
            <div class="grid grid-cols-1 gap-6 p-5 sm:grid-cols-3">
                {#each [
									{ label: "CPU", icon: CpuIcon, value: cpuPct,
										format: (v: number) => `${v.toFixed(1)}%` },
									{ label: "Memory", icon: ActivityIcon, value: memPct,
										format: () => overview ? `${formatBytes(overview.resources.memory.used_mb)} / ${formatBytes(overview.resources.memory.total_mb)}` : "—" },
									{ label: "Disk", icon: HardDriveIcon, value: diskPct,
										format: () => overview ? `${formatBytes(overview.resources.disk.used_mb)} / ${formatBytes(overview.resources.disk.total_mb)}` : "—" },
								] as metric}
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <metric.icon class="size-3" />
                                {metric.label}
                            </div>
                            <span class="text-xs font-medium tabular-nums {systemQuery.isPending ? '' : resourceTextColor(metric.value)}">
                {systemQuery.isPending ? "—" : metric.format(metric.value)}
              </span>
                        </div>
                        <div class="h-1.5 bg-muted rounded-full overflow-hidden">
                            {#if !systemQuery.isPending && overview}
                                <div class="h-full rounded-full transition-all duration-700 {resourceBarColor(metric.value)}"
                                     style="width: {metric.value}%"></div>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    {/if}
</div>