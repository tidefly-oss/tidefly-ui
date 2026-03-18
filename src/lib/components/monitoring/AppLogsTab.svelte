<script lang="ts">
  import { appLogsStore } from "$lib/stores/logs.svelte.js";
  import {
    ChevronDownIcon,
    FilterIcon,
    LoaderIcon,
    PlayIcon,
    RefreshCwIcon,
  } from "@lucide/svelte";
  import { onDestroy } from "svelte";

  let levelFilter = $state("");
  let componentFilter = $state("");
  let liveMode = $state(false);

  onDestroy(() => appLogsStore.stopStream());

  function toggleLive() {
    if (liveMode) {
      appLogsStore.stopStream();
      liveMode = false;
    } else {
      appLogsStore.startStream({
        level: levelFilter || undefined,
        component: componentFilter || undefined,
      });
      liveMode = true;
    }
  }

  function applyFilter() {
    appLogsStore.load({
      reset: true,
      level: levelFilter || undefined,
      component: componentFilter || undefined,
    });
    if (liveMode)
      appLogsStore.startStream({
        level: levelFilter || undefined,
        component: componentFilter || undefined,
      });
  }

  function normalizeLogs(raw: any[] = []) {
    return raw.map((l: any, i: number) => {
      const createdRaw = l.CreatedAt ?? l.created_at ?? null;
      const created = createdRaw ? new Date(createdRaw) : null;
      const created_at =
        created && !isNaN(created.getTime()) ? created.toISOString() : null;
      const id =
        l.ID ??
        l.id ??
        `${created_at ?? ""}-${l.Component ?? l.component ?? ""}-${i}`;
      return {
        ...l,
        id,
        created_at,
        level: l.Level ?? l.level ?? "",
        message: l.Message ?? l.message ?? "",
        component: l.Component ?? l.component ?? "",
        error: l.Error ?? l.error ?? "",
      };
    });
  }

  const logs = $derived(normalizeLogs(appLogsStore.logs));

  const levelColor: Record<string, string> = {
    INFO: "text-blue-500 bg-blue-500/10",
    WARN: "text-amber-500 bg-amber-500/10",
    ERROR: "text-red-500 bg-red-500/10",
    FATAL: "text-red-600 bg-red-600/10",
  };

  function formatTime(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  }
</script>

<div class="space-y-3">
  <div class="flex items-center gap-2 flex-wrap">
    <select
      bind:value={levelFilter}
      onchange={applyFilter}
      class="text-xs px-2 py-1.5 bg-muted/50 border rounded-lg"
    >
      <option value="">All levels</option>
      <option value="INFO">INFO</option>
      <option value="WARN">WARN</option>
      <option value="ERROR">ERROR</option>
      <option value="FATAL">FATAL</option>
    </select>
    <input
      type="text"
      placeholder="Filter component…"
      bind:value={componentFilter}
      onkeydown={(e) => e.key === "Enter" && applyFilter()}
      class="text-xs px-2 py-1.5 bg-muted/50 border rounded-lg w-40"
    />
    <button
      onclick={applyFilter}
      class="flex items-center gap-1.5 text-xs px-2 py-1.5 bg-muted/50 border rounded-lg"
    >
      <FilterIcon class="size-3" /> Apply
    </button>
    <button
      onclick={() =>
        appLogsStore.load({
          reset: true,
          level: levelFilter || undefined,
          component: componentFilter || undefined,
        })}
      class="flex items-center gap-1.5 text-xs px-2 py-1.5 bg-muted/50 border rounded-lg"
    >
      <RefreshCwIcon class="size-3" /> Refresh
    </button>
    <button
      onclick={toggleLive}
      class="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg border transition-colors {liveMode
        ? 'bg-green-500/10 border-green-500/30 text-green-600'
        : 'bg-muted/50 hover:bg-muted'}"
    >
      {#if liveMode}<span
          class="size-1.5 rounded-full bg-green-500 animate-pulse"
        ></span> Live — Pause
      {:else}<PlayIcon class="size-3" /> Live{/if}
    </button>
    <span class="text-xs text-muted-foreground ml-auto"
      >{logs.length} / {appLogsStore.total} entries</span
    >
  </div>

  <div class="bg-card border rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b bg-muted/30">
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-32"
              >Time</th
            >
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-16"
              >Level</th
            >
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-28"
              >Component</th
            >
            <th class="text-left px-4 py-2 font-medium text-muted-foreground"
              >Message</th
            >
          </tr>
        </thead>
        <tbody class="divide-y font-mono">
          {#if appLogsStore.loading && logs.length === 0}
            {#each Array(8) as _, i (i)}
              <tr class="animate-pulse">
                {#each Array(4) as _, j (j)}<td class="px-4 py-2"
                    ><div class="h-3 bg-muted rounded w-20"></div></td
                  >{/each}
              </tr>
            {/each}
          {:else if appLogsStore.error}
            <tr
              ><td colspan="4" class="px-4 py-8 text-center text-destructive"
                >{appLogsStore.error}</td
              ></tr
            >
          {:else if logs.length === 0}
            <tr
              ><td
                colspan="4"
                class="px-4 py-12 text-center text-muted-foreground"
                >No logs found</td
              ></tr
            >
          {:else}
            {#each logs as log, i (log.id ?? i)}
              <tr class="hover:bg-muted/20 transition-colors">
                <td class="px-4 py-2 text-muted-foreground whitespace-nowrap"
                  >{formatTime(log.created_at)}</td
                >
                <td class="px-4 py-2">
                  <span
                    class="px-1.5 py-0.5 rounded text-xs font-medium {levelColor[
                      log.level
                    ] ?? 'text-muted-foreground'}">{log.level}</span
                  >
                </td>
                <td class="px-4 py-2 text-muted-foreground truncate max-w-28"
                  >{log.component}</td
                >
                <td class="px-4 py-2">
                  <div class="truncate max-w-xl">{log.message}</div>
                  {#if log.error}<div
                      class="text-red-400 truncate max-w-xl mt-0.5"
                    >
                      {log.error}
                    </div>{/if}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    {#if appLogsStore.hasMore && !appLogsStore.loading}
      <div class="px-4 py-3 border-t">
        <button
          onclick={() =>
            appLogsStore.loadMore({
              level: levelFilter || undefined,
              component: componentFilter || undefined,
            })}
          class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ChevronDownIcon class="size-3" /> Load more ({appLogsStore.total -
            appLogsStore.logs.length} remaining)
        </button>
      </div>
    {/if}
    {#if appLogsStore.loading && appLogsStore.logs.length > 0}
      <div
        class="px-4 py-3 border-t flex items-center gap-2 text-xs text-muted-foreground"
      >
        <LoaderIcon class="size-3 animate-spin" /> Loading…
      </div>
    {/if}
  </div>
</div>
