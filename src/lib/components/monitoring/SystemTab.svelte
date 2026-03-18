<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import { metricsStore } from "$lib/stores/system.metrics.svelte.js";
  import { CpuIcon, HardDriveIcon, NetworkIcon } from "@lucide/svelte";
  import { scaleUtc } from "d3-scale";
  import { curveNatural } from "d3-shape";
  import { AreaChart } from "layerchart";
  import { onDestroy, onMount } from "svelte";

  onMount(() => {
    metricsStore.load();
    metricsStore.startPolling(60_000);
  });
  onDestroy(() => metricsStore.stopPolling());

  const cpuConfig = {
    cpu: { label: "CPU %", color: "var(--chart-1)" },
  } satisfies Chart.ChartConfig;
  const memConfig = {
    memory: { label: "Memory %", color: "var(--chart-2)" },
  } satisfies Chart.ChartConfig;
  const diskConfig = {
    disk: { label: "Disk %", color: "var(--chart-3)" },
  } satisfies Chart.ChartConfig;

  const chartData = $derived(
    metricsStore.metrics.map((m) => ({
      date: new Date(m.collected_at),
      cpu: Math.round(m.cpu_percent * 10) / 10,
      memory: Math.round(m.mem_percent * 10) / 10,
      disk: Math.round(m.disk_percent * 10) / 10,
    })),
  );

  const latest = $derived(metricsStore.latest);

  function resourceColor(p: number) {
    return p > 80
      ? "text-red-500"
      : p > 60
        ? "text-amber-500"
        : "text-green-500";
  }
  function resourceBg(p: number) {
    return p > 80 ? "bg-red-500" : p > 60 ? "bg-amber-500" : "bg-green-500";
  }
  function fmtGB(mb: number) {
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb} MB`;
  }
  function xFmt(v: Date) {
    return v.toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  function tooltipFmt(v: Date) {
    return v.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const hoursOptions = [6, 24, 48] as const;
</script>

<div class="space-y-4">
  <!-- Range selector -->
  <div class="flex items-center gap-1">
    {#each hoursOptions as h}
      <button
        onclick={() => metricsStore.load(h)}
        class="text-xs px-2.5 py-1 rounded border transition-colors
          {metricsStore.hours === h
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-muted/50 border-border hover:bg-muted'}"
      >
        {h}h
      </button>
    {/each}
    {#if metricsStore.loading}
      <span class="text-xs text-muted-foreground ml-2">Updating…</span>
    {/if}
  </div>

  <!-- Current values — 3 Progress Bars -->
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <div class="bg-card border rounded-xl p-4 space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CpuIcon class="size-3.5" /> CPU
        </div>
        {#if latest}
          <span
            class="text-sm font-bold tabular-nums {resourceColor(
              latest.cpu_percent,
            )}"
          >
            {latest.cpu_percent.toFixed(1)}%
          </span>
        {:else}
          <span class="text-sm font-bold text-muted-foreground">—</span>
        {/if}
      </div>
      <div class="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full transition-all {resourceBg(
            latest?.cpu_percent ?? 0,
          )}"
          style="width: {latest?.cpu_percent ?? 0}%"
        ></div>
      </div>
    </div>

    <div class="bg-card border rounded-xl p-4 space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <NetworkIcon class="size-3.5" /> Memory
        </div>
        {#if latest}
          <span
            class="text-sm font-bold tabular-nums {resourceColor(
              latest.mem_percent,
            )}"
          >
            {latest.mem_percent.toFixed(1)}%
          </span>
        {:else}
          <span class="text-sm font-bold text-muted-foreground">—</span>
        {/if}
      </div>
      <div class="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full transition-all {resourceBg(
            latest?.mem_percent ?? 0,
          )}"
          style="width: {latest?.mem_percent ?? 0}%"
        ></div>
      </div>
      {#if latest}
        <p class="text-xs text-muted-foreground">
          {fmtGB(latest.mem_used_mb)} / {fmtGB(latest.mem_total_mb)}
        </p>
      {/if}
    </div>

    <div class="bg-card border rounded-xl p-4 space-y-2">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <HardDriveIcon class="size-3.5" /> Disk
        </div>
        {#if latest}
          <span
            class="text-sm font-bold tabular-nums {resourceColor(
              latest.disk_percent,
            )}"
          >
            {latest.disk_percent.toFixed(1)}%
          </span>
        {:else}
          <span class="text-sm font-bold text-muted-foreground">—</span>
        {/if}
      </div>
      <div class="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          class="h-full rounded-full transition-all {resourceBg(
            latest?.disk_percent ?? 0,
          )}"
          style="width: {latest?.disk_percent ?? 0}%"
        ></div>
      </div>
      {#if latest}
        <p class="text-xs text-muted-foreground">
          {fmtGB(latest.disk_used_mb)} / {fmtGB(latest.disk_total_mb)}
        </p>
      {/if}
    </div>
  </div>

  {#if chartData.length > 1}
    <!-- CPU Chart -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium flex items-center gap-1.5">
          <CpuIcon class="size-3.5 text-muted-foreground" /> CPU Usage
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <Chart.Container config={cpuConfig} class="h-40 w-full">
          <AreaChart
            data={chartData}
            x="date"
            xScale={scaleUtc()}
            yPadding={[0, 8]}
            series={[
              { key: "cpu", label: "CPU %", color: cpuConfig.cpu.color },
            ]}
            props={{
              area: {
                curve: curveNatural,
                "fill-opacity": 0.15,
                line: { class: "stroke-1" },
              },
              xAxis: { format: xFmt },
              yAxis: { format: (v: number) => `${v}%` },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />
            {/snippet}
          </AreaChart>
        </Chart.Container>
      </Card.Content>
    </Card.Root>

    <!-- Memory Chart -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium flex items-center gap-1.5">
          <NetworkIcon class="size-3.5 text-muted-foreground" /> Memory Usage
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <Chart.Container config={memConfig} class="h-40 w-full">
          <AreaChart
            data={chartData}
            x="date"
            xScale={scaleUtc()}
            yPadding={[0, 8]}
            series={[
              {
                key: "memory",
                label: "Memory %",
                color: memConfig.memory.color,
              },
            ]}
            props={{
              area: {
                curve: curveNatural,
                "fill-opacity": 0.15,
                line: { class: "stroke-1" },
              },
              xAxis: { format: xFmt },
              yAxis: { format: (v: number) => `${v}%` },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />
            {/snippet}
          </AreaChart>
        </Chart.Container>
      </Card.Content>
    </Card.Root>

    <!-- Disk Chart -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm font-medium flex items-center gap-1.5">
          <HardDriveIcon class="size-3.5 text-muted-foreground" /> Disk Usage
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <Chart.Container config={diskConfig} class="h-40 w-full">
          <AreaChart
            data={chartData}
            x="date"
            xScale={scaleUtc()}
            yPadding={[0, 8]}
            series={[
              { key: "disk", label: "Disk %", color: diskConfig.disk.color },
            ]}
            props={{
              area: {
                curve: curveNatural,
                "fill-opacity": 0.15,
                line: { class: "stroke-1" },
              },
              xAxis: { format: xFmt },
              yAxis: { format: (v: number) => `${v}%` },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip labelFormatter={tooltipFmt} indicator="line" />
            {/snippet}
          </AreaChart>
        </Chart.Container>
      </Card.Content>
    </Card.Root>
  {:else if metricsStore.loading}
    <div
      class="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground"
    >
      Loading metrics…
    </div>
  {:else}
    <div
      class="bg-card border rounded-xl p-8 text-center text-sm text-muted-foreground"
    >
      No metrics yet — data is collected every 60 seconds.
    </div>
  {/if}
</div>
