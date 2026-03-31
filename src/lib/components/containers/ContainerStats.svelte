<script lang="ts">
import { ClockIcon, CpuIcon, HardDriveIcon, NetworkIcon } from "@lucide/svelte";
import { onDestroy } from "svelte";
import { containersApi } from "$lib/api/v1/containers";

type Props = { containerId: string; containerStatus: string };
let { containerId, containerStatus }: Props = $props();

type StatEntry = {
	cpu_percent: number;
	mem_usage_mb: number;
	mem_limit_mb: number;
	mem_percent: number;
	network_rx_mb: number;
	network_tx_mb: number;
	block_read_mb: number;
	block_write_mb: number;
	pids: number;
};

let stats = $state<StatEntry[]>([]);
let statsEs: EventSource | null = null;
let streaming = $state(false);

const latestStats = $derived(stats[0] ?? null);
const cpuHistory = $derived(
	[...stats]
		.reverse()
		.map((s) => s.cpu_percent)
		.slice(-30)
);
const memHistory = $derived(
	[...stats]
		.reverse()
		.map((s) => s.mem_percent)
		.slice(-30)
);

function resourceColor(p: number) {
	return p > 80 ? "#ef4444" : p > 60 ? "#f59e0b" : "#22c55e";
}

function sparkPath(values: number[], width = 200, height = 40): string {
	if (values.length < 2) return "";
	const max = Math.max(...values, 1);
	const pts = values.map(
		(v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`
	);
	return `M${pts.join(" L")}`;
}

function start() {
	stop();
	stats = [];
	statsEs = new EventSource(containersApi.statsUrl(containerId));
	streaming = true;
	statsEs.addEventListener("stats", (e) => {
		try {
			const entry = JSON.parse(e.data);
			stats = [entry, ...stats].slice(0, 60);
		} catch {}
	});
	statsEs.onerror = () => {
		streaming = false;
	};
}

function stop() {
	statsEs?.close();
	statsEs = null;
	streaming = false;
}

$effect(() => {
	start();
	return () => stop();
});

onDestroy(() => stop());
</script>

<div class="space-y-4">
  <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    <!-- CPU -->
    <div class="bg-card border rounded-xl p-4">
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <CpuIcon class="size-3" /> CPU
      </div>
      <div class="text-2xl font-bold tabular-nums">
        {latestStats ? latestStats.cpu_percent.toFixed(1) : "—"}%
      </div>
      {#if cpuHistory.length > 1}
        <svg
          viewBox="0 0 200 40"
          class="w-full h-8 mt-2"
          preserveAspectRatio="none"
        >
          <path
            d={sparkPath(cpuHistory)}
            fill="none"
            stroke={resourceColor(latestStats?.cpu_percent ?? 0)}
            stroke-width="1.5"
          />
        </svg>
      {/if}
    </div>

    <!-- Memory -->
    <div class="bg-card border rounded-xl p-4">
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <HardDriveIcon class="size-3" /> Memory
      </div>
      <div class="text-2xl font-bold tabular-nums">
        {latestStats ? latestStats.mem_percent.toFixed(1) : "—"}%
      </div>
      <div class="text-xs text-muted-foreground mt-1">
        {latestStats
          ? `${latestStats.mem_usage_mb.toFixed(0)} / ${latestStats.mem_limit_mb.toFixed(0)} MB`
          : "—"}
      </div>
      {#if memHistory.length > 1}
        <svg
          viewBox="0 0 200 40"
          class="w-full h-8 mt-1"
          preserveAspectRatio="none"
        >
          <path
            d={sparkPath(memHistory)}
            fill="none"
            stroke={resourceColor(latestStats?.mem_percent ?? 0)}
            stroke-width="1.5"
          />
        </svg>
      {/if}
    </div>

    <!-- Network -->
    <div class="bg-card border rounded-xl p-4">
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <NetworkIcon class="size-3" /> Network
      </div>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground text-xs">↓ RX</span>
          <span class="font-mono text-xs">
            {latestStats ? `${latestStats.network_rx_mb.toFixed(4)} MB` : "—"}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground text-xs">↑ TX</span>
          <span class="font-mono text-xs">
            {latestStats ? `${latestStats.network_tx_mb.toFixed(4)} MB` : "—"}
          </span>
        </div>
      </div>
    </div>

    <!-- Block I/O -->
    <div class="bg-card border rounded-xl p-4">
      <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <ClockIcon class="size-3" /> Block I/O & PIDs
      </div>
      <div class="space-y-1 text-sm">
        <div class="flex justify-between">
          <span class="text-muted-foreground text-xs">Read</span>
          <span class="font-mono text-xs"
            >{latestStats
              ? `${latestStats.block_read_mb.toFixed(4)} MB`
              : "—"}</span
          >
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground text-xs">Write</span>
          <span class="font-mono text-xs"
            >{latestStats
              ? `${latestStats.block_write_mb.toFixed(4)} MB`
              : "—"}</span
          >
        </div>
        <div class="flex justify-between">
          <span class="text-muted-foreground text-xs">PIDs</span>
          <span class="font-mono text-xs">{latestStats?.pids ?? "—"}</span>
        </div>
      </div>
    </div>
  </div>

  {#if !streaming && stats.length === 0}
    <div
      class="bg-card border rounded-xl px-4 py-8 text-center text-sm text-muted-foreground"
    >
      {containerStatus === "running"
        ? "Connecting to stats stream…"
        : "Container is not running"}
    </div>
  {/if}
</div>
