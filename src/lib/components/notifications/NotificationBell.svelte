<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Notification } from "$lib/api/v1/types/notifications.js";
  import { notificationsStore } from "$lib/stores/notifications.svelte";
  import { Bell, Check, CheckCheck, Trash2, X } from "@lucide/svelte";
  import { onDestroy, onMount } from "svelte";

  let open = $state(false);
  let dropdownRef: HTMLDivElement | null = null;

  function severityClass(severity: Notification["severity"]): string {
    switch (severity) {
      case "FATAL":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "ERROR":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "WARN":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  }

  function severityDot(severity: Notification["severity"]): string {
    switch (severity) {
      case "FATAL":
        return "bg-red-500";
      case "ERROR":
        return "bg-orange-500";
      case "WARN":
        return "bg-yellow-500";
    }
  }

  function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
  }

  function handleOutside(e: MouseEvent) {
    if (open && dropdownRef && !dropdownRef.contains(e.target as Node)) {
      open = false;
    }
  }

  function goToContainerLogs(n: Notification) {
    open = false;
    goto(`/dashboard/containers/${n.container_id}?tab=logs`);
  }

  onMount(async () => {
    await notificationsStore.load();
    notificationsStore.connectSSE();
    document.addEventListener("click", handleOutside);
  });

  onDestroy(() => {
    notificationsStore.disconnectSSE();
    if (typeof document !== 'undefined') {
      document.removeEventListener("click", handleOutside);
    }
  });

  const unread = $derived(notificationsStore.unread);
  const count = $derived(notificationsStore.unreadCount);
</script>

<div class="relative" bind:this={dropdownRef}>
  <!-- Bell Button -->
  <button
    onclick={() => (open = !open)}
    class="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    aria-label="Notifications"
  >
    <Bell class="h-5 w-5" />
    {#if count > 0}
      <span
        class="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
      >
        {count > 99 ? "99+" : count}
      </span>
    {/if}
  </button>

  <!-- Dropdown -->
  {#if open}
    <div
      class="absolute right-0 top-11 z-50 flex w-105 flex-col rounded-lg border border-border bg-background shadow-xl"
    >
      <!-- Header -->
      <div
        class="flex items-center justify-between border-b border-border px-4 py-3"
      >
        <div class="flex items-center gap-2">
          <span class="font-semibold text-foreground">Notifications</span>
          {#if count > 0}
            <span
              class="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400"
            >
              {count} unread
            </span>
          {/if}
        </div>
        <div class="flex items-center gap-1">
          {#if count > 0}
            <button
              onclick={() => notificationsStore.acknowledgeAll()}
              class="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Mark all as done"
            >
              <CheckCheck class="h-3.5 w-3.5" /> All done
            </button>
          {/if}
          <button
            onclick={() => notificationsStore.clearDone()}
            class="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Clear acknowledged"
          >
            <Trash2 class="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="max-h-120 overflow-y-auto">
        {#if notificationsStore.loading}
          <div
            class="flex items-center justify-center py-8 text-sm text-muted-foreground"
          >
            Loading…
          </div>
        {:else if unread.length === 0}
          <div
            class="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground"
          >
            <Check class="h-8 w-8 opacity-40" />
            <span class="text-sm">All clear</span>
          </div>
        {:else}
          {#each unread as n (n.id)}
            <div
              class="group flex gap-3 border-b border-border/50 px-4 py-3 transition-colors hover:bg-accent/30"
            >
              <!-- Severity dot -->
              <div class="mt-1.5 shrink-0">
                <span
                  class="block h-2 w-2 rounded-full {severityDot(n.severity)}"
                ></span>
              </div>

              <!-- Content — klickbar → Container Logs -->
              <button
                class="min-w-0 flex-1 cursor-pointer text-left"
                onclick={() => goToContainerLogs(n)}
              >
                <div class="mb-1 flex items-center gap-2">
                  <span
                    class="rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide {severityClass(
                      n.severity,
                    )}"
                  >
                    {n.severity}
                  </span>
                  <span
                    class="truncate font-mono text-xs text-muted-foreground"
                  >
                    {n.container_name}
                  </span>
                  {#if n.occurrence_count > 1}
                    <span
                      class="ml-auto shrink-0 text-xs font-medium text-muted-foreground"
                    >
                      ×{n.occurrence_count}
                    </span>
                  {/if}
                </div>
                <p
                  class="line-clamp-2 text-xs leading-relaxed text-foreground/80 group-hover:text-foreground transition-colors"
                >
                  {n.message}
                </p>
                <span class="mt-1 block text-[10px] text-muted-foreground/60">
                  {formatTime(n.updated_at)}
                </span>
              </button>

              <!-- Actions — immer sichtbar, größer -->
              <div class="flex shrink-0 flex-col gap-1 justify-center">
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    notificationsStore.acknowledge(n.id);
                  }}
                  class="rounded-md p-1.5 text-muted-foreground/50 transition-all hover:bg-green-500/20 hover:text-green-400 hover:scale-110"
                  title="Mark as done"
                >
                  <Check class="h-4 w-4" />
                </button>
                <button
                  onclick={(e) => {
                    e.stopPropagation();
                    notificationsStore.remove(n.id);
                  }}
                  class="rounded-md p-1.5 text-muted-foreground/50 transition-all hover:bg-red-500/20 hover:text-red-400 hover:scale-110"
                  title="Delete"
                >
                  <X class="h-4 w-4" />
                </button>
              </div>
            </div>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      {#if unread.length > 0}
        <div class="border-t border-border px-4 py-2 text-center">
          <a
            href="/dashboard/containers"
            class="text-xs text-muted-foreground hover:text-foreground"
            onclick={() => (open = false)}
          >
            View all containers →
          </a>
        </div>
      {/if}
    </div>
  {/if}
</div>
