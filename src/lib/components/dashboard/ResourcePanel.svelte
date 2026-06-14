<script lang="ts">
    import { ActivityIcon, ChevronRightIcon, CircleAlert, CpuIcon, HardDriveIcon } from "@lucide/svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import type { SystemMetricsPayload } from "$lib/stores/ws.svelte";

    interface Props {
        metrics: SystemMetricsPayload | null;
    }

    const { metrics }: Props = $props();

    const cpuPct = $derived(metrics?.cpu_percent ?? 0);
    const memPct = $derived(metrics?.mem_percent ?? 0);
    const diskPct = $derived(
        metrics?.disk_used && metrics.disk_total ? (metrics.disk_used / metrics.disk_total) * 100 : 0
    );

    const hasWarning = $derived(cpuPct > 80 || memPct > 80 || diskPct > 85);

    function resourceBarColor(pct: number) {
        return pct > 80 ? "bg-destructive" : pct > 60 ? "bg-amber-500" : "bg-primary";
    }

    function resourceTextColor(pct: number) {
        return pct > 80 ? "text-destructive" : pct > 60 ? "text-amber-500" : "text-foreground";
    }

    const resourceMetrics = $derived([
        {
            label: "CPU",
            icon: CpuIcon,
            value: cpuPct,
            text: cpuPct > 0 ? `${cpuPct.toFixed(1)}%` : "—",
            tooltip: "Current CPU usage of the host machine",
        },
        {
            label: "Memory",
            icon: ActivityIcon,
            value: memPct,
            text: memPct > 0 ? `${memPct.toFixed(1)}%` : "—",
            tooltip: "RAM usage — high usage can slow down containers",
        },
        {
            label: "Disk",
            icon: HardDriveIcon,
            value: diskPct,
            text: diskPct > 0 ? `${diskPct.toFixed(1)}%` : "—",
            tooltip: "Disk space used — images and volumes consume storage",
        },
    ]);
</script>

<div class="bg-card border rounded-xl overflow-hidden {hasWarning ? 'border-amber-500/20' : ''}">
    <div class="flex items-center justify-between px-5 py-3.5 border-b">
        <div class="flex items-center gap-2">
            <h2 class="font-medium text-sm">Resources</h2>
            {#if hasWarning}
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
        {#each resourceMetrics as metric}
            <Tooltip.Provider delayDuration={300}>
                <Tooltip.Root>
                    <Tooltip.Trigger class="w-full text-left">
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <metric.icon class="size-3" />
                                    {metric.label}
                                </div>
                                <span
                                        class="text-xs font-medium tabular-nums {!metrics
										? 'text-muted-foreground'
										: resourceTextColor(metric.value)}"
                                >
									{!metrics ? "—" : metric.text}
								</span>
                            </div>
                            <div class="h-1 bg-muted rounded-full overflow-hidden">
                                {#if metrics}
                                    <div
                                            class="h-full rounded-full transition-all duration-700 {resourceBarColor(metric.value)}"
                                            style="width: {Math.min(metric.value, 100)}%"
                                    ></div>
                                {/if}
                            </div>
                        </div>
                    </Tooltip.Trigger>
                    <Tooltip.Content class="text-xs max-w-40">{metric.tooltip}</Tooltip.Content>
                </Tooltip.Root>
            </Tooltip.Provider>
        {/each}
    </div>
</div>