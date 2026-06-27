<script lang="ts">
import { CircleIcon, ContainerIcon } from "@lucide/svelte";
import type { ContainerStatus } from "$lib/api/v1/types";
import { Badge } from "$lib/components/ui/badge/index.js";

type Container = {
	id: string;
	name: string;
	image: string;
	status: ContainerStatus;
};

type Props = {
	containers: Container[];
	networkName: string;
};

let { containers, networkName }: Props = $props();

const statusDot: Record<ContainerStatus, string> = {
	running: "#22c55e",
	stopped: "#6b7280",
	exited: "#6b7280",
	paused: "#f59e0b",
	created: "#3b82f6",
	dead: "#ef4444",
	restarting: "#3b82f6",
	unknown: "#6b7280",
};
</script>

<div class="lg:col-span-2 bg-card border rounded-xl overflow-hidden">
    <div class="px-4 py-3 border-b flex items-center gap-2 text-sm font-medium">
        <ContainerIcon class="size-3.5" />
        Containers
        <Badge variant="secondary" class="text-xs px-1.5 py-0 h-4">{containers.length}</Badge>
    </div>
    <div class="divide-y">
        {#if containers.length === 0}
            <div class="px-4 py-8 text-center">
                <p class="text-sm text-muted-foreground">No containers in this project's network</p>
                <p class="text-xs text-muted-foreground mt-1">
                    Connect containers to <span class="font-mono">{networkName}</span>
                </p>
            </div>
        {:else}
            {#each containers as c (c.id)}
                <div class="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <CircleIcon class="size-2 fill-current shrink-0" style="color: {statusDot[c.status]}" />
                    <div class="flex-1 min-w-0">
                        <span class="text-sm font-medium">{c.name}</span>
                        <div class="text-xs text-muted-foreground mt-0.5">{c.image}</div>
                    </div>
                    <a href="/dashboard/containers/{c.id}" class="text-xs text-muted-foreground hover:text-foreground">
                        View →
                    </a>
                </div>
            {/each}
        {/if}
    </div>
</div>