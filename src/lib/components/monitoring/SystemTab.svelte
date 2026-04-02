<script lang="ts">
import { ActivityIcon, ClockIcon, CpuIcon, HardDriveIcon, NetworkIcon } from "@lucide/svelte";
import { createQuery } from "@tanstack/svelte-query";
import { scaleUtc } from "d3-scale";
import { curveNatural } from "d3-shape";
import { AreaChart } from "layerchart";
import { systemApi } from "$lib/api/v1/system/index.js";
import * as Card from "$lib/components/ui/card/index.js";
import type * as Chart from "$lib/components/ui/chart/index.js";

interface ChartPoint {
	date: Date;
	cpu: number;
	memory: number;
	disk: number;
}

const MAX_HISTORY = 60;
let history = $state<ChartPoint[]>([]);
let lastCpu = $state<number | null>(null);

const overviewQuery = createQuery(() => ({
	queryKey: ["system", "overview"],
	queryFn: () => systemApi.overview(),
	refetchInterval: 30_000,
}));

const metricsQuery = createQuery(() => ({
	queryKey: ["system", "metrics"],
	queryFn: () => systemApi.metrics(),
	refetchInterval: 15_000,
}));

const cpu = $derived(
	metricsQuery.data?.cpu_percent ?? overviewQuery.data?.resources.cpu_percent ?? null
);
const mem = $derived(
	metricsQuery.data?.mem_percent ?? overviewQuery.data?.resources.memory.percent ?? null
);
const disk = $derived(
	metricsQuery.data?.disk_percent ?? overviewQuery.data?.resources.disk.percent ?? null
);
const memUsed = $derived(
	metricsQuery.data?.mem_used_mb ?? overviewQuery.data?.resources.memory.used_mb ?? null
);
const memTotal = $derived(
	metricsQuery.data?.mem_total_mb ?? overviewQuery.data?.resources.memory.total_mb ?? null
);
const diskUsed = $derived(
	metricsQuery.data?.disk_used_mb ?? overviewQuery.data?.resources.disk.used_mb ?? null
);
const diskTotal = $derived(
	metricsQuery.data?.disk_total_mb ?? overviewQuery.data?.resources.disk.total_mb ?? null
);

$effect(() => {
	const data = metricsQuery.data;
	if (!data) return;
	if (data.cpu_percent === lastCpu) return;
	lastCpu = data.cpu_percent;
	const point: ChartPoint = {
		date: new Date(),
		cpu: Math.round(data.cpu_percent * 10) / 10,
		memory: Math.round(data.mem_percent * 10) / 10,
		disk: Math.round(data.disk_percent * 10) / 10,
	};
	if (history.length === 0) {
		history = [{ ...point, date: new Date(Date.now() - 15_000) }, point];
	} else {
		history = [...history, point].slice(-MAX_HISTORY);
	}
});

const cpuConfig = { cpu: { label: "CPU %", color: "var(--chart-1)" } } satisfies Chart.ChartConfig;
const memConfig = {
	memory: { label: "Memory %", color: "var(--chart-2)" },
} satisfies Chart.ChartConfig;
const diskConfig = {
	disk: { label: "Disk %", color: "var(--chart-3)" },
} satisfies Chart.ChartConfig;

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
function fmtUptime(s: number) {
	const d = Math.floor(s / 86400);
	const h = Math.floor((s % 86400) / 3600);
	const m = Math.floor((s % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}
</script>

<div class="space-y-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="bg-card border rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CpuIcon class="size-3.5" /> CPU
                </div>
                <span class="text-sm font-bold tabular-nums {resourceColor(cpu)}">
          {cpu != null ? `${cpu.toFixed(1)}%` : '—'}
        </span>
            </div>
            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 {resourceBg(cpu)}" style="width: {cpu ?? 0}%"></div>
            </div>
        </div>

        <div class="bg-card border rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <NetworkIcon class="size-3.5" /> Memory
                </div>
                <span class="text-sm font-bold tabular-nums {resourceColor(mem)}">
          {mem != null ? `${mem.toFixed(1)}%` : '—'}
        </span>
            </div>
            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 {resourceBg(mem)}" style="width: {mem ?? 0}%"></div>
            </div>
            {#if memUsed && memTotal}
                <p class="text-xs text-muted-foreground">{fmtGB(memUsed)} / {fmtGB(memTotal)}</p>
            {/if}
        </div>

        <div class="bg-card border rounded-xl p-4 space-y-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HardDriveIcon class="size-3.5" /> Disk
                </div>
                <span class="text-sm font-bold tabular-nums {resourceColor(disk)}">
          {disk != null ? `${disk.toFixed(1)}%` : '—'}
        </span>
            </div>
            <div class="h-1.5 rounded-full bg-muted overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500 {resourceBg(disk)}" style="width: {disk ?? 0}%"></div>
            </div>
            {#if diskUsed && diskTotal}
                <p class="text-xs text-muted-foreground">{fmtGB(diskUsed)} / {fmtGB(diskTotal)}</p>
            {/if}
        </div>
    </div>

    {#if metricsQuery.data}
        <div class="flex gap-6 text-xs text-muted-foreground">
      <span class="flex items-center gap-1.5">
        <ClockIcon class="size-3" />
        Uptime: <span class="text-foreground font-medium">{fmtUptime(metricsQuery.data.uptime_seconds)}</span>
      </span>
            <span class="flex items-center gap-1.5">
        <ActivityIcon class="size-3" />
        Goroutines: <span class="text-foreground font-medium">{metricsQuery.data.goroutines}</span>
      </span>
        </div>
    {/if}

    {#if history.length > 1}
        <Card.Root>
            <Card.Header class="pb-2">
                <Card.Title class="text-sm font-medium flex items-center gap-1.5">
                    <CpuIcon class="size-3.5 text-muted-foreground" /> CPU Usage
                </Card.Title>
            </Card.Header>
            <Card.Content>
                <Chart.Container config={cpuConfig} class="h-40 w-full">
                    <AreaChart data={history} x="date" xScale={scaleUtc()} yPadding={[0, 8]}
                               series={[{ key: 'cpu', label: 'CPU %', color: cpuConfig.cpu.color }]}
                               props={{ area: { curve: curveNatural, 'fill-opacity': 0.15, line: { class: 'stroke-1' } },
                     xAxis: { format: xFmt, ticks: 4 },
                     yAxis: { format: (v: number) => `${v}%` } }}>
                        {#snippet tooltip()}<Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />{/snippet}
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
                    <AreaChart data={history} x="date" xScale={scaleUtc()} yPadding={[0, 8]}
                               series={[{ key: 'memory', label: 'Memory %', color: memConfig.memory.color }]}
                               props={{ area: { curve: curveNatural, 'fill-opacity': 0.15, line: { class: 'stroke-1' } },
                     xAxis: { format: xFmt, ticks: 4 },
                     yAxis: { format: (v: number) => `${v}%` } }}>
                        {#snippet tooltip()}<Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />{/snippet}
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
                    <AreaChart data={history} x="date" xScale={scaleUtc()} yPadding={[0, 8]}
                               series={[{ key: 'disk', label: 'Disk %', color: diskConfig.disk.color }]}
                               props={{ area: { curve: curveNatural, 'fill-opacity': 0.15, line: { class: 'stroke-1' } },
                     xAxis: { format: xFmt, ticks: 4 },
                     yAxis: { format: (v: number) => `${v}%` } }}>
                        {#snippet tooltip()}<Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />{/snippet}
                    </AreaChart>
                </Chart.Container>
            </Card.Content>
        </Card.Root>
    {/if}
</div>