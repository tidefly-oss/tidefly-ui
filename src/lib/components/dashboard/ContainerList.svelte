<script lang="ts">
    import { ChevronRightIcon, CircleIcon, PlayIcon, SquareIcon } from "@lucide/svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import type {Container, ContainerStatus} from "$lib/api/v1/types";

    interface Props {
        isPending: boolean;
        containers: Container[];
        onAction: (id: string, action: "start" | "stop") => void;
        pendingId?: string;
    }

    const { isPending, containers, onAction, pendingId }: Props = $props();

    const runningCount = $derived(containers.filter((c) => c.status === "running").length);

    function statusColor(status: ContainerStatus) {
        const m: Record<ContainerStatus, string> = {
            running: "#22c55e",
            stopped: "#6b7280",
            exited: "#6b7280",
            dead: "#ef4444",
            paused: "#f59e0b",
            restarting: "#3b82f6",
            created: "#3b82f6",
            unknown: "#6b7280",
        };
        return m[status] ?? "#6b7280";
    }
</script>

<div class="bg-card border rounded-xl overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3.5 border-b">
        <div class="flex items-center gap-2">
            <h2 class="font-medium text-sm">Containers</h2>
            {#if !isPending && containers.length > 0}
				<span class="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
					{runningCount}/{containers.length}
				</span>
            {/if}
        </div>
        <a
                href="/dashboard/containers"
                class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
            View all <ChevronRightIcon class="size-3" />
        </a>
    </div>
    <div class="divide-y">
        {#if isPending}
            {#each Array(3) as _, i (i)}
                <div class="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                    <div class="size-2 rounded-full bg-muted shrink-0"></div>
                    <div class="flex-1 space-y-1.5">
                        <div class="h-3.5 bg-muted rounded w-32"></div>
                        <div class="h-3 bg-muted rounded w-48"></div>
                    </div>
                </div>
            {/each}
        {:else}
            {#each containers.slice(0, 8) as c (c.id)}
                <div class="px-5 py-3 flex items-center gap-3 hover:bg-muted/20 transition-colors group">
                    <Tooltip.Provider delayDuration={300}>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <CircleIcon
                                        class="size-2 shrink-0 fill-current"
                                        style="color: {statusColor(c.status)}"
                                />
                            </Tooltip.Trigger>
                            <Tooltip.Content class="text-xs capitalize">{c.status}</Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-sm font-medium truncate">{c.name}</span>
                            <span class="text-xs text-muted-foreground font-mono truncate hidden sm:block max-w-48">
								{c.image}
							</span>
                        </div>
                    </div>
                    <div
                            class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                        {#if c.status === "running"}
                            <Button
                                    variant="ghost"
                                    size="icon"
                                    class="size-7"
                                    disabled={pendingId === c.id}
                                    onclick={() => onAction(c.id, "stop")}
                            >
                                <SquareIcon class="size-3" />
                            </Button>
                        {:else}
                            <Button
                                    variant="ghost"
                                    size="icon"
                                    class="size-7"
                                    disabled={pendingId === c.id}
                                    onclick={() => onAction(c.id, "start")}
                            >
                                <PlayIcon class="size-3" />
                            </Button>
                        {/if}
                        <a href="/dashboard/containers/{c.id}">
                            <ChevronRightIcon class="size-4 text-muted-foreground" />
                        </a>
                    </div>
                </div>
            {/each}
            {#if containers.length > 8}
                <div class="px-5 py-2.5">
                    <a
                            href="/dashboard/containers"
                            class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                        +{containers.length - 8} more <ChevronRightIcon class="size-3" />
                    </a>
                </div>
            {/if}
        {/if}
    </div>
</div>