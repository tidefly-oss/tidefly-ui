<script lang="ts">
    import { DatabaseIcon, PlusIcon } from "@lucide/svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Button } from "$lib/components/ui/button/index.js";

    interface Props {
        cpuPct: number;
        memPct: number;
        diskPct: number;
        hasWarning: boolean;
        systemHealthy: boolean;
        unreadCount: number;
    }

    const { cpuPct, memPct, diskPct, hasWarning, systemHealthy, unreadCount }: Props = $props();
</script>

<div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
        <h1 class="text-xl font-semibold tracking-tight">Dashboard</h1>
        <Tooltip.Provider delayDuration={200}>
            <Tooltip.Root>
                <Tooltip.Trigger>
					<span
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border
						{systemHealthy
							? 'bg-green-500/10 border-green-500/20 text-green-500'
							: 'bg-amber-500/10 border-amber-500/20 text-amber-500'}"
                    >
						<span
                                class="size-1.5 rounded-full {systemHealthy
								? 'bg-green-500'
								: 'bg-amber-500 animate-pulse'}"
                        ></span>
                        {systemHealthy ? "All systems healthy" : "Needs attention"}
					</span>
                </Tooltip.Trigger>
                <Tooltip.Content class="text-xs max-w-48">
                    {#if cpuPct > 80}CPU at {cpuPct.toFixed(0)}% · {/if}
                    {#if memPct > 80}Memory at {memPct.toFixed(0)}% · {/if}
                    {#if diskPct > 85}Disk at {diskPct.toFixed(0)}%{/if}
                    {#if systemHealthy}No issues detected{/if}
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>
    <div class="flex items-center gap-2">
        <a href="/dashboard/containers/templates">
            <Button size="sm" variant="outline" class="gap-1.5">
                <DatabaseIcon class="size-3.5" /> Deploy Service
            </Button>
        </a>
        <a href="/dashboard/containers?action=dockerfile">
            <Button size="sm" class="gap-1.5">
                <PlusIcon class="size-3.5" /> Run Container
            </Button>
        </a>
    </div>
</div>