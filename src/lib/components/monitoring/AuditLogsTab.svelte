<script lang="ts">
  import { auditLogsStore } from "$lib/stores/logs.svelte.js";
  import {
    CheckCircleIcon,
    ChevronDownIcon,
    FilterIcon,
    LoaderIcon,
    RefreshCwIcon,
    XCircleIcon,
  } from "@lucide/svelte";

  let actionFilter = $state("");
  let successFilter = $state<"" | "true" | "false">("");

  function applyFilter() {
    auditLogsStore.load({
      reset: true,
      action: actionFilter || undefined,
      success: successFilter === "" ? undefined : successFilter === "true",
    });
  }

  function normalizeLogs(raw: any[] = []) {
    return raw.map((l: any, i: number) => {
      const createdRaw = l.CreatedAt ?? l.created_at ?? null;
      const created = createdRaw ? new Date(createdRaw) : null;
      const created_at =
        created && !isNaN(created.getTime()) ? created.toISOString() : null;
      const id = l.ID ?? l.id ?? `${created_at ?? ""}-${i}`;
      return { ...l, id, created_at };
    });
  }

  const logs = $derived(normalizeLogs(auditLogsStore.logs));

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    const d = new Date(iso);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
  }
</script>

<div class="space-y-3">
  <div class="flex items-center gap-2 flex-wrap">
    <input
      type="text"
      placeholder="Filter action…"
      bind:value={actionFilter}
      onkeydown={(e) => e.key === "Enter" && applyFilter()}
      class="text-xs px-2 py-1.5 bg-muted/50 border rounded-lg w-40"
    />
    <select
      bind:value={successFilter}
      onchange={applyFilter}
      class="text-xs px-2 py-1.5 bg-muted/50 border rounded-lg"
    >
      <option value="">All</option>
      <option value="true">Success</option>
      <option value="false">Failed</option>
    </select>
    <button
      onclick={applyFilter}
      class="flex items-center gap-1.5 text-xs px-2 py-1.5 bg-muted/50 border rounded-lg"
    >
      <FilterIcon class="size-3" /> Apply
    </button>
    <button
      onclick={() => auditLogsStore.load({ reset: true })}
      class="flex items-center gap-1.5 text-xs px-2 py-1.5 bg-muted/50 border rounded-lg"
    >
      <RefreshCwIcon class="size-3" /> Refresh
    </button>
    <span class="text-xs text-muted-foreground ml-auto"
      >{logs.length} / {auditLogsStore.total} entries</span
    >
  </div>

  <div class="bg-card border rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b bg-muted/30">
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-36"
              >Time</th
            >
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-8"
            ></th>
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-40"
              >Action</th
            >
            <th class="text-left px-4 py-2 font-medium text-muted-foreground"
              >User</th
            >
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-28"
              >Resource</th
            >
            <th
              class="text-left px-4 py-2 font-medium text-muted-foreground w-28"
              >IP</th
            >
          </tr>
        </thead>
        <tbody class="divide-y font-mono">
          {#if auditLogsStore.loading && logs.length === 0}
            {#each Array(8) as _, i (i)}
              <tr class="animate-pulse">
                {#each Array(6) as _, j (j)}<td class="px-4 py-2"
                    ><div class="h-3 bg-muted rounded w-16"></div></td
                  >{/each}
              </tr>
            {/each}
          {:else if auditLogsStore.error}
            <tr
              ><td colspan="6" class="px-4 py-8 text-center text-destructive"
                >{auditLogsStore.error}</td
              ></tr
            >
          {:else if logs.length === 0}
            <tr
              ><td
                colspan="6"
                class="px-4 py-12 text-center text-muted-foreground"
                >No audit logs found</td
              ></tr
            >
          {:else}
            {#each logs as log, i (log.id ?? i)}
              <tr class="hover:bg-muted/20 transition-colors">
                <td class="px-4 py-2 text-muted-foreground whitespace-nowrap"
                  >{formatDate(log.created_at)}</td
                >
                <td class="px-4 py-2">
                  {#if log.success}<CheckCircleIcon
                      class="size-3.5 text-green-500"
                    />
                  {:else}<XCircleIcon class="size-3.5 text-red-500" />{/if}
                </td>
                <td class="px-4 py-2"
                  ><span class="px-1.5 py-0.5 bg-muted rounded font-mono"
                    >{log.action}</span
                  ></td
                >
                <td class="px-4 py-2 text-muted-foreground truncate max-w-32"
                  >{log.user_email || log.user_id || "—"}</td
                >
                <td class="px-4 py-2 text-muted-foreground truncate max-w-28"
                  >{log.resource_id || "—"}</td
                >
                <td class="px-4 py-2 text-muted-foreground"
                  >{log.ip_address || "—"}</td
                >
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
    {#if auditLogsStore.hasMore && !auditLogsStore.loading}
      <div class="px-4 py-3 border-t">
        <button
          onclick={() =>
            auditLogsStore.loadMore({
              action: actionFilter || undefined,
              success:
                successFilter === "" ? undefined : successFilter === "true",
            })}
          class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
        >
          <ChevronDownIcon class="size-3" /> Load more ({auditLogsStore.total -
            auditLogsStore.logs.length} remaining)
        </button>
      </div>
    {/if}
    {#if auditLogsStore.loading && auditLogsStore.logs.length > 0}
      <div
        class="px-4 py-3 border-t flex items-center gap-2 text-xs text-muted-foreground"
      >
        <LoaderIcon class="size-3 animate-spin" /> Loading…
      </div>
    {/if}
  </div>
</div>
