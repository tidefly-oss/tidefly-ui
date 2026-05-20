<script lang="ts">
import { CpuIcon, HardDriveIcon, NetworkIcon } from "@lucide/svelte";
import { scaleUtc } from "d3-scale";
import { curveNatural } from "d3-shape";
import { AreaChart } from "layerchart";
import * as Card from "$lib/components/ui/card/index.js";
import * as Chart from "$lib/components/ui/chart/index.js";
import { wsStore as ws } from "$lib/stores/ws.svelte";

// Mirrors actual backend payload: internal/platform/eventbus/events.go → SystemMetricsPayload
interface LiveMetrics {
	cpu_percent: number;
	mem_percent: number;
	disk_used: number; // MB
	disk_total: number; // MB
}

interface ChartPoint {
	date: Date;
	cpu: number;
	memory: number;
	disk: number;
}

const MAX_HISTORY = 60;

let metrics = $state<LiveMetrics | null>(null);
let history = $state<ChartPoint[]>([]);
let lastCpu = $state<number | null>(null);

const diskPercent = $derived(
	metrics ? Math.round((metrics.disk_used / metrics.disk_total) * 1000) / 10 : null
);

$effect(() => {
	return ws.on("system.metrics", (payload: LiveMetrics) => {
		metrics = payload;

		if (payload.cpu_percent === lastCpu) return;
		lastCpu = payload.cpu_percent;

		const dp = Math.round((payload.disk_used / payload.disk_total) * 1000) / 10;

		const point: ChartPoint = {
			date: new Date(),
			cpu: Math.round(payload.cpu_percent * 10) / 10,
			memory: Math.round(payload.mem_percent * 10) / 10,
			disk: dp,
		};

		if (Number.isNaN(point.cpu) || Number.isNaN(point.memory) || Number.isNaN(point.disk)) return;

		if (history.length === 0) {
			history = [{ ...point, date: new Date(Date.now() - 3000) }, point];
		} else {
			history = [...history, point].slice(-MAX_HISTORY);
		}
	});
});

// ── Chart configs ──────────────────────────────────────────────────────────────

const cpuConfig = {
	cpu: { label: "CPU %", color: "var(--chart-1)" },
} satisfies Chart.ChartConfig;

const memConfig = {
	memory: { label: "Memory %", color: "var(--chart-2)" },
} satisfies Chart.ChartConfig;

const diskConfig = {
	disk: { label: "Disk %", color: "var(--chart-3)" },
} satisfies Chart.ChartConfig;

// ── Helpers ────────────────────────────────────────────────────────────────────

function xFmt(v: Date) {
	return v.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

function tooltipFmt(v: Date) {
	return v.toLocaleString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function resourceColor(p: number | null) {
	if (p == null) return "text-muted-foreground";
	return p > 80 ? "text-red-500" : p > 60 ? "text-amber-500" : "text-green-500";
}

function resourceBg(p: number | null) {
	if (p == null) return "bg-muted";
	return p > 80 ? "bg-red-500" : p > 60 ? "bg-amber-500" : "bg-green-500";
}

function fmtGB(mb: number) {
	return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
}

const areaProps = {
	area: {
		curve: curveNatural,
		"fill-opacity": 0.15,
		line: { class: "stroke-1" },
	},
	xAxis: { format: xFmt, ticks: 4 },
	yAxis: { format: (v: number) => `${v}%` },
};
</script>

<div class="space-y-4">
    <!-- ── Stat Cards ── -->
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">

        <!-- CPU -->
        <div class="bg-card border rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CpuIcon class="size-3.5" /> CPU
                </div>
                <span class="text-sm font-bold tabular-nums {resourceColor(metrics?.cpu_percent ?? null)}">
					{metrics != null ? `${metrics.cpu_percent.toFixed(1)}%` : "—"}
				</span>
            </div>
            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                        class="h-full rounded-full transition-all duration-500 {resourceBg(metrics?.cpu_percent ?? null)}"
                        style="width: {metrics?.cpu_percent ?? 0}%"
                ></div>
            </div>
        </div>

        <!-- Memory -->
        <div class="bg-card border rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <NetworkIcon class="size-3.5" /> Memory
                </div>
                <span class="text-sm font-bold tabular-nums {resourceColor(metrics?.mem_percent ?? null)}">
					{metrics != null ? `${metrics.mem_percent.toFixed(1)}%` : "—"}
				</span>
            </div>
            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                        class="h-full rounded-full transition-all duration-500 {resourceBg(metrics?.mem_percent ?? null)}"
                        style="width: {metrics?.mem_percent ?? 0}%"
                ></div>
            </div>
        </div>

        <!-- Disk -->
        <div class="bg-card border rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HardDriveIcon class="size-3.5" /> Disk
                </div>
                <span class="text-sm font-bold tabular-nums {resourceColor(diskPercent)}">
					{diskPercent != null ? `${diskPercent.toFixed(1)}%` : "—"}
				</span>
            </div>
            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                        class="h-full rounded-full transition-all duration-500 {resourceBg(diskPercent)}"
                        style="width: {diskPercent ?? 0}%"
                ></div>
            </div>
            {#if metrics}
                <p class="text-xs text-muted-foreground">
                    {fmtGB(metrics.disk_used)} / {fmtGB(metrics.disk_total)}
                </p>
            {/if}
        </div>
    </div>

    <!-- ── Charts ── -->
    {#if history.length > 1 && !isNaN(history[0].cpu)}
        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-sm font-medium flex items-center gap-1.5">
                    <CpuIcon class="size-3.5 text-muted-foreground" /> CPU Usage
                </Card.Title>
            </Card.Header>
            <Card.Content>
                <Chart.Container config={cpuConfig} class="h-40 w-full">
                    <AreaChart
                            data={history}
                            x="date"
                            xScale={scaleUtc()}
                            yPadding={[0, 8]}
                            series={[{ key: "cpu", label: "CPU %", color: cpuConfig.cpu.color }]}
                            props={areaProps}
                    >
                        {#snippet tooltip()}
                            <Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />
                        {/snippet}
                    </AreaChart>
                </Chart.Container>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-sm font-medium flex items-center gap-1.5">
                    <NetworkIcon class="size-3.5 text-muted-foreground" /> Memory Usage
                </Card.Title>
            </Card.Header>
            <Card.Content>
                <Chart.Container config={memConfig} class="h-40 w-full">
                    <AreaChart
                            data={history}
                            x="date"
                            xScale={scaleUtc()}
                            yPadding={[0, 8]}
                            series={[{ key: "memory", label: "Memory %", color: memConfig.memory.color }]}
                            props={areaProps}
                    >
                        {#snippet tooltip()}
                            <Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />
                        {/snippet}
                    </AreaChart>
                </Chart.Container>
            </Card.Content>
        </Card.Root>

        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-sm font-medium flex items-center gap-1.5">
                    <HardDriveIcon class="size-3.5 text-muted-foreground" /> Disk Usage
                </Card.Title>
            </Card.Header>
            <Card.Content>
                <Chart.Container config={diskConfig} class="h-40 w-full">
                    <AreaChart
                            data={history}
                            x="date"
                            xScale={scaleUtc()}
                            yPadding={[0, 8]}
                            series={[{ key: "disk", label: "Disk %", color: diskConfig.disk.color }]}
                            props={areaProps}
                    >
                        {#snippet tooltip()}
                            <Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />
                        {/snippet}
                    </AreaChart>
                </Chart.Container>
            </Card.Content>
        </Card.Root>
    {:else if !metrics}
        <div class="space-y-3">
            {#each [1, 2, 3] as _}
                <div class="bg-card border rounded-xl p-4 h-48 animate-pulse">
                    <div class="h-4 bg-muted rounded w-32 mb-4"></div>
                    <div class="h-32 bg-muted/50 rounded"></div>
                </div>
            {/each}
        </div>
    {/if}
</div>