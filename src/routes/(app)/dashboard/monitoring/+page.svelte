<script lang="ts">
  import AppLogsTab from '$lib/components/monitoring/AppLogsTab.svelte';
  import AuditLogsTab from '$lib/components/monitoring/AuditLogsTab.svelte';
  import CaddyLogsTab from '$lib/components/monitoring/CaddyLogsTab.svelte';
  import SystemTab from '$lib/components/monitoring/SystemTab.svelte';
  import { appLogsStore, auditLogsStore } from '$lib/stores/logs.svelte.js';
  import { ActivityIcon, MonitorIcon, NetworkIcon, ShieldIcon } from '@lucide/svelte';
  import { onMount } from 'svelte';

  type Tab = 'system' | 'app' | 'audit' | 'proxy';
  let activeTab = $state<Tab>('system');

  onMount(() => {
    appLogsStore.load({ reset: true });
    auditLogsStore.load({ reset: true });
  });
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-lg font-semibold">Monitoring</h1>
    <p class="text-sm text-muted-foreground mt-0.5">
      System health, application logs and audit trail
    </p>
  </div>

  <div class="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
    <button
            onclick={() => (activeTab = 'system')}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors {activeTab === 'system'
        ? 'bg-background shadow-sm font-medium'
        : 'text-muted-foreground hover:text-foreground'}"
    >
      <MonitorIcon class="size-3.5" /> System
    </button>
    <button
            onclick={() => (activeTab = 'proxy')}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors {activeTab === 'proxy'
        ? 'bg-background shadow-sm font-medium'
        : 'text-muted-foreground hover:text-foreground'}"
    >
      <NetworkIcon class="size-3.5" /> Proxy Logs
    </button>
    <button
            onclick={() => (activeTab = 'app')}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors {activeTab === 'app'
        ? 'bg-background shadow-sm font-medium'
        : 'text-muted-foreground hover:text-foreground'}"
    >
      <ActivityIcon class="size-3.5" /> App Logs
      <span class="text-xs text-muted-foreground">({appLogsStore.total})</span>
    </button>
    <button
            onclick={() => (activeTab = 'audit')}
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors {activeTab === 'audit'
        ? 'bg-background shadow-sm font-medium'
        : 'text-muted-foreground hover:text-foreground'}"
    >
      <ShieldIcon class="size-3.5" /> Audit Log
      <span class="text-xs text-muted-foreground">({auditLogsStore.total})</span>
    </button>
  </div>

  {#if activeTab === 'system'}
    <SystemTab />
  {:else if activeTab === 'proxy'}
    <CaddyLogsTab />
  {:else if activeTab === 'app'}
    <AppLogsTab />
  {:else}
    <AuditLogsTab />
  {/if}
</div>