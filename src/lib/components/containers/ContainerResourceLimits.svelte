<script lang="ts">
import {
	BadgeQuestionMark,
	CheckIcon,
	ChevronDownIcon,
	CpuIcon,
	GitBranchIcon,
	HardDriveIcon,
	RefreshCwIcon,
	RotateCcwIcon,
	TrendingUpIcon,
	TriangleAlert,
} from "@lucide/svelte";
import { containersApi } from "$lib/api/v1/containers";
import type { DeployStrategy, ResourceLimits } from "$lib/api/v1/types";
import { Button } from "$lib/components/ui/button/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";

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
		cpu_cores: 0,
		memory_mb: 0,
		memory_swap_mb: 0,
		restart_policy: "unless-stopped",
		max_retries: 0,
		replicas: 1,
		deploy_strategy: "rolling",
		autoscaling: undefined,
	}),
	onchange,
	readonly = false,
	compact = false,
}: Props = $props();

let saving = $state(false);
let saveResult = $state<{ ok: boolean; message: string; restarted: boolean } | null>(null);
let localValue = $state<ResourceLimits>({ ...value });
let autoscalingEnabled = $state(false);
let swapOpen = $state(false);

$effect(() => {
	if (containerId) loadCurrent();
});

async function loadCurrent() {
	if (!containerId) return;
	try {
		const cfg = await containersApi.getResources(containerId);
		localValue = {
			cpu_cores: cfg.cpu_cores ?? 0,
			memory_mb: cfg.memory_mb ?? 0,
			memory_swap_mb: cfg.memory_swap_mb ?? 0,
			restart_policy: cfg.restart_policy || "unless-stopped",
			max_retries: cfg.max_retries ?? 0,
			replicas: cfg.replicas ?? 1,
			deploy_strategy: cfg.deploy_strategy ?? "rolling",
			autoscaling: cfg.autoscaling,
		};
		autoscalingEnabled = !!cfg.autoscaling?.enabled;
		originalMemoryMB = localValue.memory_mb;
		swapOpen = localValue.memory_swap_mb !== 0;
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
		localValue.memory_mb < originalMemoryMB
);

function toggleAutoscaling(enabled: boolean) {
	autoscalingEnabled = enabled;
	localValue = {
		...localValue,
		autoscaling: enabled ? { enabled: true, min: 1, max: 5, metric: "cpu", target: 70 } : undefined,
	};
}

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
	{
		value: "no",
		label: "No",
		desc: "Never restart",
		detail: "Container stays stopped after it exits — you restart it manually.",
	},
	{
		value: "always",
		label: "Always",
		desc: "Always restart",
		detail: "Restarts automatically every time it stops, even if you stopped it on purpose.",
	},
	{
		value: "on-failure",
		label: "On Failure",
		desc: "Only on crash",
		detail: "Only restarts when the container crashes (non-zero exit code). Ignores manual stops.",
	},
	{
		value: "unless-stopped",
		label: "Unless Stopped",
		desc: "Recommended default",
		detail: "Restarts automatically unless you explicitly stopped it. Best for most manifest.",
	},
];

const deployStrategies: { value: DeployStrategy; label: string; desc: string; detail: string }[] = [
	{
		value: "rolling",
		label: "Rolling",
		desc: "Zero-downtime",
		detail: "Updates one replica at a time. Your service stays online throughout the deploy.",
	},
	{
		value: "recreate",
		label: "Recreate",
		desc: "Brief downtime",
		detail:
			"Stops all running instances first, then starts the new version. Simpler but causes a short outage.",
	},
	{
		value: "blue-green",
		label: "Blue / Green",
		desc: "Instant switch",
		detail:
			"Starts the new version alongside the old one, then switches all traffic at once. Easy rollback.",
	},
];

const memoryPresets = [
	{ label: "∞", value: 0 },
	{ label: "128 MB", value: 128 },
	{ label: "256 MB", value: 256 },
	{ label: "512 MB", value: 512 },
	{ label: "1 GB", value: 1024 },
	{ label: "2 GB", value: 2048 },
	{ label: "4 GB", value: 4096 },
];

const cpuPresets = [
	{ label: "∞", value: 0 },
	{ label: "0.25", value: 0.25 },
	{ label: "0.5", value: 0.5 },
	{ label: "1", value: 1 },
	{ label: "2", value: 2 },
	{ label: "4", value: 4 },
];

function formatMemory(mb: number) {
	if (mb === 0) return "Unlimited";
	if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
	return `${mb} MB`;
}

const btnBase =
	"px-3 py-1.5 rounded-md text-xs border transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";
const btnActive = "bg-primary text-primary-foreground border-primary";
const btnInactive =
	"bg-muted/50 border-border hover:border-primary/50 hover:bg-muted text-muted-foreground";
</script>

{#snippet tip(text: string)}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <BadgeQuestionMark class="size-3.5 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-help shrink-0" />
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-56 text-xs leading-relaxed">{text}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

<div class="divide-y divide-border {compact ? 'text-sm' : ''}">

  <!-- ══ RESOURCES ══════════════════════════════════════════════════════════ -->
  <div class="space-y-6 pb-6">
    <p class="pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Resources</p>

    <!-- CPU -->
    <div class="space-y-2.5">
      <div class="flex items-center gap-1.5">
        <CpuIcon class="size-3.5 text-muted-foreground shrink-0" />
        <Label class="text-xs font-medium">CPU Limit</Label>
        {@render tip("How many CPU cores this container may use. ∞ means no limit — the container can use all available CPU on the host.")}
        <span class="text-xs ml-auto {localValue.cpu_cores === 0 ? 'text-muted-foreground' : 'text-blue-400'}">
					{localValue.cpu_cores === 0 ? "Unlimited" : `${localValue.cpu_cores} core${localValue.cpu_cores !== 1 ? "s" : ""}`}
				</span>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        {#each cpuPresets as preset}
          <button
                  class="{btnBase} {localValue.cpu_cores === preset.value ? btnActive : btnInactive}"
                  disabled={readonly}
                  onclick={() => (localValue = { ...localValue, cpu_cores: preset.value })}
          >{preset.label}</button>
        {/each}
        <Input
                type="number" min="0" max="64" step="0.25" placeholder="Custom"
                class="h-8 w-24 text-xs"
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
    <div class="space-y-2.5">
      <div class="flex items-center gap-1.5">
        <HardDriveIcon class="size-3.5 text-muted-foreground shrink-0" />
        <Label class="text-xs font-medium">Memory Limit</Label>
        {@render tip("Maximum RAM this container can use. If it exceeds this, the container is killed and restarted. ∞ means no limit.")}
        <span class="text-xs ml-auto {localValue.memory_mb === 0 ? 'text-muted-foreground' : 'text-blue-400'}">
					{formatMemory(localValue.memory_mb)}
				</span>
      </div>
      <div class="flex gap-1.5 flex-wrap">
        {#each memoryPresets as preset}
          <button
                  class="{btnBase} {localValue.memory_mb === preset.value ? btnActive : btnInactive}"
                  disabled={readonly}
                  onclick={() => (localValue = { ...localValue, memory_mb: preset.value })}
          >{preset.label}</button>
        {/each}
        <Input
                type="number" min="0" step="64" placeholder="MB"
                class="h-8 w-24 text-xs"
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

    <!-- Memory Swap — collapsible advanced -->
    {#if !compact}
      <div>
        <button
                class="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                onclick={() => (swapOpen = !swapOpen)}
        >
          <ChevronDownIcon class="size-3.5 transition-transform duration-150 {swapOpen ? '' : '-rotate-90'}" />
          Advanced
          {#if localValue.memory_swap_mb !== 0}
						<span class="text-blue-400/70 ml-1">
							· Swap: {localValue.memory_swap_mb === -1 ? "Unlimited" : formatMemory(localValue.memory_swap_mb)}
						</span>
          {/if}
        </button>
        {#if swapOpen}
          <div class="mt-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3 space-y-2.5">
            <p class="text-xs text-muted-foreground leading-relaxed">
              <strong class="text-foreground/70">Memory Swap</strong> — lets the container spill onto disk when RAM runs out. Useful only if your container occasionally spikes. Leave off for most services.
            </p>
            <div class="flex gap-1.5 flex-wrap">
              {#each [
                { label: "No swap", value: 0 },
                { label: "Unlimited", value: -1 },
                { label: "2× RAM", value: localValue.memory_mb > 0 ? localValue.memory_mb * 2 : 0 },
              ] as preset}
                <button
                        class="{btnBase} {localValue.memory_swap_mb === preset.value ? btnActive : btnInactive}"
                        disabled={readonly || (preset.label === "2× RAM" && localValue.memory_mb === 0)}
                        onclick={() => (localValue = { ...localValue, memory_swap_mb: preset.value })}
                >{preset.label}</button>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- ══ SCALING ════════════════════════════════════════════════════════════ -->
  {#if !compact}
    <div class="space-y-4 py-6">
      <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Scaling</p>

      <div class="flex items-center gap-1.5">
        <TrendingUpIcon class="size-3.5 text-muted-foreground shrink-0" />
        <Label class="text-xs font-medium">Autoscaling</Label>
        {@render tip("Tidefly automatically adds or removes replicas based on CPU and memory load. No configuration needed.")}
        <div class="ml-auto flex gap-1.5">
          <button
                  class="{btnBase} {!autoscalingEnabled ? btnActive : btnInactive}"
                  disabled={readonly}
                  onclick={() => toggleAutoscaling(false)}
          >Off</button>
          <button
                  class="{btnBase} {autoscalingEnabled ? btnActive : btnInactive}"
                  disabled={readonly}
                  onclick={() => toggleAutoscaling(true)}
          >On</button>
        </div>
      </div>

      {#if autoscalingEnabled}
        <p class="text-xs text-green-400/70 pl-5 leading-relaxed">
          Autoscaling is active — Tidefly manages replicas based on CPU and memory usage.
        </p>
      {:else}
        <p class="text-xs text-muted-foreground/50 pl-5 leading-relaxed">
          Tidefly will automatically spin up more instances when load is high and scale back down when it drops.
        </p>
      {/if}
    </div>
  {/if}

  <!-- ══ BEHAVIOUR ══════════════════════════════════════════════════════════ -->
  <div class="space-y-6 py-6">
    <p class="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">Behaviour</p>

    <!-- Deploy Strategy -->
    {#if !compact}
      <div class="space-y-2.5">
        <div class="flex items-center gap-1.5">
          <GitBranchIcon class="size-3.5 text-muted-foreground shrink-0" />
          <Label class="text-xs font-medium">Deploy Strategy</Label>
          {@render tip("Controls how new versions are rolled out. Rolling is the safest default — your service stays online during deploys.")}
        </div>
        <div class="grid grid-cols-3 gap-2">
          {#each deployStrategies as strategy}
            <button
                    class="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer
								disabled:cursor-not-allowed disabled:opacity-50
								{localValue.deploy_strategy === strategy.value
									? 'bg-primary/10 border-primary text-foreground'
									: 'bg-muted/30 border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'}"
                    disabled={readonly}
                    onclick={() => (localValue = { ...localValue, deploy_strategy: strategy.value })}
            >
              <span class="text-xs font-medium">{strategy.label}</span>
              <span class="text-[10px] opacity-60 leading-snug">{strategy.desc}</span>
            </button>
          {/each}
        </div>
        <p class="text-xs text-muted-foreground/60 leading-relaxed">
          {deployStrategies.find(s => s.value === localValue.deploy_strategy)?.detail}
        </p>
      </div>
    {/if}

    <!-- Restart Policy -->
    <div class="space-y-2.5">
      <div class="flex items-center gap-1.5">
        <RotateCcwIcon class="size-3.5 text-muted-foreground shrink-0" />
        <Label class="text-xs font-medium">Restart Policy</Label>
        {@render tip("What happens when the container stops. 'Unless Stopped' is recommended for most manifest — it restarts automatically after crashes or reboots.")}
      </div>
      <div class="grid grid-cols-2 gap-2">
        {#each restartPolicies as policy}
          <button
                  class="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer
							disabled:cursor-not-allowed disabled:opacity-50
							{localValue.restart_policy === policy.value
								? 'bg-primary/10 border-primary text-foreground'
								: 'bg-muted/30 border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'}"
                  disabled={readonly}
                  onclick={() => (localValue = { ...localValue, restart_policy: policy.value })}
          >
            <span class="text-xs font-medium">{policy.label}</span>
            <span class="text-[10px] opacity-60 leading-snug">{policy.desc}</span>
          </button>
        {/each}
      </div>
      {#if localValue.restart_policy === "on-failure" && !compact}
        <div class="flex items-center gap-2 pt-1">
          <Label class="text-xs text-muted-foreground shrink-0">Max retries</Label>
          <Input type="number" min="0" max="100" class="h-8 w-20 text-xs" disabled={readonly} bind:value={localValue.max_retries} />
          <span class="text-xs text-muted-foreground">(0 = unlimited)</span>
        </div>
      {/if}
    </div>
  </div>

  <!-- ── Save ── -->
  {#if containerId && !readonly}
    <div class="pt-5 flex items-center gap-3">
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