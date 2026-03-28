<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import {
    CheckIcon,
    CpuIcon,
    HardDriveIcon,
    RefreshCwIcon,
    RotateCcwIcon,
    TriangleAlert,
  } from "@lucide/svelte";
  import { containersApi } from "$lib/api/v1/containers";
  import type {ResourceLimits} from "$lib/api/v1/types";

  type Props = {
    containerId?: string;
    value?: ResourceLimits;
    onchange?: (v: ResourceLimits) => void;
    readonly?: boolean;
    compact?: boolean;
  };

  let {
    containerId,
    value = $bindable<ResourceLimits>({
      cpu_cores:      0,
      memory_mb:      0,
      memory_swap_mb: 0,
      restart_policy: "unless-stopped",
      max_retries:    0,
    }),
    onchange,
    readonly = false,
    compact = false,
  }: Props = $props();

  let saving     = $state(false);
  let saveResult = $state<{ ok: boolean; message: string; restarted: boolean } | null>(null);
  let localValue = $state<ResourceLimits>({ ...value });

  $effect(() => {
    if (containerId) {
      loadCurrent();
    }
  });

  async function loadCurrent() {
    try {
      const cfg = await containersApi.getResources(containerId!);
      localValue = {
        cpu_cores:      cfg.cpu_cores      ?? 0,
        memory_mb:      cfg.memory_mb      ?? 0,
        memory_swap_mb: cfg.memory_swap_mb ?? 0,
        restart_policy: cfg.restart_policy || "unless-stopped",
        max_retries:    cfg.max_retries    ?? 0,
      };
      originalMemoryMB = localValue.memory_mb;
    } catch {}
  }

  $effect(() => {
    if (!containerId) {
      value = { ...localValue };
      onchange?.(localValue);
    }
  });

  let originalMemoryMB = $state(0);

  const willRestart = $derived(
          containerId !== undefined &&
          originalMemoryMB > 0 &&
          localValue.memory_mb > 0 &&
          localValue.memory_mb < originalMemoryMB,
  );

  async function save() {
    if (!containerId) return;
    saving = true;
    saveResult = null;
    try {
      const data = await containersApi.updateResources(containerId, localValue);
      saveResult = { ok: true, message: data.message, restarted: data.restart_required };
      originalMemoryMB = localValue.memory_mb;
      setTimeout(() => (saveResult = null), 4000);
    } catch {
      saveResult = { ok: false, message: "Failed to update", restarted: false };
    } finally {
      saving = false;
    }
  }

  const restartPolicies = [
    { value: "no",             label: "No",             desc: "Never restart" },
    { value: "always",         label: "Always",         desc: "Always restart" },
    { value: "on-failure",     label: "On Failure",     desc: "Restart only on error" },
    { value: "unless-stopped", label: "Unless Stopped", desc: "Always, except manual stop" },
  ];

  const memoryPresets = [
    { label: "∞",    value: 0    },
    { label: "128",  value: 128  },
    { label: "256",  value: 256  },
    { label: "512",  value: 512  },
    { label: "1 GB", value: 1024 },
    { label: "2 GB", value: 2048 },
    { label: "4 GB", value: 4096 },
  ];

  const cpuPresets = [
    { label: "∞",    value: 0    },
    { label: "0.25", value: 0.25 },
    { label: "0.5",  value: 0.5  },
    { label: "1",    value: 1    },
    { label: "2",    value: 2    },
    { label: "4",    value: 4    },
  ];

  function formatMemory(mb: number) {
    if (mb === 0) return "Unlimited";
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
  }
</script>

<div class="space-y-5 {compact ? 'text-sm' : ''}">
  <!-- CPU -->
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <CpuIcon class="size-3.5 text-muted-foreground" />
      <Label class="text-xs font-medium">CPU Limit</Label>
      {#if localValue.cpu_cores === 0}
        <span class="text-xs text-muted-foreground ml-auto">Unlimited</span>
      {:else}
        <span class="text-xs text-blue-400 ml-auto">{localValue.cpu_cores} core{localValue.cpu_cores !== 1 ? "s" : ""}</span>
      {/if}
    </div>
    <div class="flex gap-1.5 flex-wrap">
      {#each cpuPresets as preset}
        <button
                class="px-2.5 py-1 rounded-md text-xs border transition-colors
            {localValue.cpu_cores === preset.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted text-muted-foreground'}"
                disabled={readonly}
                onclick={() => (localValue = { ...localValue, cpu_cores: preset.value })}
        >{preset.label}</button>
      {/each}
      <Input
              type="number" min="0" max="64" step="0.25" placeholder="Custom"
              class="h-7 w-24 text-xs pl-2 pr-1"
              disabled={readonly}
              value={localValue.cpu_cores > 0 && !cpuPresets.some(p => p.value === localValue.cpu_cores) ? localValue.cpu_cores : ""}
              oninput={(e) => {
          const v = parseFloat((e.target as HTMLInputElement).value);
          if (!isNaN(v) && v >= 0) localValue = { ...localValue, cpu_cores: v };
        }}
      />
    </div>
  </div>

  <!-- Memory -->
  <div class="space-y-2">
    <div class="flex items-center gap-2">
      <HardDriveIcon class="size-3.5 text-muted-foreground" />
      <Label class="text-xs font-medium">Memory Limit</Label>
      {#if localValue.memory_mb === 0}
        <span class="text-xs text-muted-foreground ml-auto">Unlimited</span>
      {:else}
        <span class="text-xs text-blue-400 ml-auto">{formatMemory(localValue.memory_mb)}</span>
      {/if}
    </div>
    <div class="flex gap-1.5 flex-wrap">
      {#each memoryPresets as preset}
        <button
                class="px-2.5 py-1 rounded-md text-xs border transition-colors
            {localValue.memory_mb === preset.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted text-muted-foreground'}"
                disabled={readonly}
                onclick={() => (localValue = { ...localValue, memory_mb: preset.value })}
        >{preset.label}</button>
      {/each}
      <Input
              type="number" min="0" step="64" placeholder="MB"
              class="h-7 w-24 text-xs"
              disabled={readonly}
              value={localValue.memory_mb > 0 && !memoryPresets.some(p => p.value === localValue.memory_mb) ? localValue.memory_mb : ""}
              oninput={(e) => {
          const v = parseInt((e.target as HTMLInputElement).value);
          if (!isNaN(v) && v >= 0) localValue = { ...localValue, memory_mb: v };
        }}
      />
    </div>
    {#if willRestart}
      <div class="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
        <TriangleAlert class="size-3.5 shrink-0 mt-0.5" />
        <span>Reducing memory will <strong>restart</strong> the container to apply the new limit.</span>
      </div>
    {/if}
  </div>

  <!-- Memory Swap -->
  {#if !compact}
    <div class="space-y-2">
      <div class="flex items-center gap-2">
        <Label class="text-xs font-medium text-muted-foreground">Memory Swap</Label>
        <span class="text-xs text-muted-foreground ml-auto">
          {#if localValue.memory_swap_mb === 0}No swap{:else if localValue.memory_swap_mb === -1}Unlimited{:else}{formatMemory(localValue.memory_swap_mb)} total{/if}
        </span>
      </div>
      <div class="flex gap-1.5">
        {#each [{ label: "No swap", value: 0 }, { label: "∞", value: -1 }, { label: "2× RAM", value: localValue.memory_mb > 0 ? localValue.memory_mb * 2 : 0 }] as preset}
          <button
                  class="px-2.5 py-1 rounded-md text-xs border transition-colors
              {localValue.memory_swap_mb === preset.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted text-muted-foreground'}"
                  disabled={readonly || (preset.value === 0 && localValue.memory_mb === 0)}
                  onclick={() => (localValue = { ...localValue, memory_swap_mb: preset.value })}
          >{preset.label}</button>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Restart Policy -->
  <div class="space-y-2">
    <Label class="text-xs font-medium flex items-center gap-2">
      <RotateCcwIcon class="size-3.5 text-muted-foreground" />
      Restart Policy
    </Label>
    <div class="flex gap-1.5 flex-wrap">
      {#each restartPolicies as policy}
        <button
                class="px-2.5 py-1 rounded-md text-xs border transition-colors
            {localValue.restart_policy === policy.value
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-muted text-muted-foreground'}"
                disabled={readonly}
                title={policy.desc}
                onclick={() => (localValue = { ...localValue, restart_policy: policy.value })}
        >{policy.label}</button>
      {/each}
    </div>
    {#if localValue.restart_policy === "on-failure" && !compact}
      <div class="flex items-center gap-2 mt-1.5">
        <Label class="text-xs text-muted-foreground w-24 shrink-0">Max retries</Label>
        <Input type="number" min="0" max="100" class="h-7 w-20 text-xs" disabled={readonly} bind:value={localValue.max_retries} />
        <span class="text-xs text-muted-foreground">(0 = unlimited)</span>
      </div>
    {/if}
  </div>

  <!-- Save Button -->
  {#if containerId && !readonly}
    <div class="pt-1 flex items-center gap-3">
      <Button size="sm" class="gap-2" disabled={saving} onclick={save}>
        {#if saving}
          <RefreshCwIcon class="size-3.5 animate-spin" /> Applying…
        {:else if willRestart}
          <TriangleAlert class="size-3.5" /> Apply & Restart
        {:else}
          <CheckIcon class="size-3.5" /> Apply Changes
        {/if}
      </Button>
      {#if saveResult}
        <div class="flex items-center gap-1.5 text-xs {saveResult.ok ? 'text-green-400' : 'text-red-400'}">
          {#if saveResult.ok}
            <CheckIcon class="size-3.5" />
            {saveResult.message}
            {#if saveResult.restarted}<span class="text-amber-400 ml-1">· Container restarted</span>{/if}
          {:else}
            <TriangleAlert class="size-3.5" />
            {saveResult.message}
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>