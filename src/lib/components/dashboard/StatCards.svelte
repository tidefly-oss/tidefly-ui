<script lang="ts">
    import {
        BoxIcon,
        ChevronRightIcon,
        ContainerIcon,
        ImageIcon,
        InfoIcon,
        NetworkIcon,
    } from "@lucide/svelte";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";
    import type {Container, Image as DockerImage, Network as DockerNetwork, Volume as DockerVolume} from "$lib/api/v1";


    interface Props {
        isPending: boolean;
        containers: Container[];
        images: DockerImage[];
        networks: DockerNetwork[];
        volumes: DockerVolume[];
    }

    const { isPending, containers, images, networks, volumes }: Props = $props();

    const runningCount = $derived(containers.filter((c) => c.status === "running").length);
    const stoppedCount = $derived(containers.filter((c) => c.status !== "running").length);

    const statCards = $derived([
        {
            href: "/dashboard/containers",
            icon: ContainerIcon,
            value: containers.length,
            label: "Containers",
            tooltip: "Docker containers running on this host",
            sub:
                containers.length > 0
                    ? `${runningCount} running${stoppedCount > 0 ? ` · ${stoppedCount} stopped` : ""}`
                    : "None yet",
            bar: containers.length > 0 ? runningCount / containers.length : null,
        },
        {
            href: "/dashboard/images",
            icon: ImageIcon,
            value: images.length,
            label: "Images",
            tooltip: "Downloaded Docker images available locally",
            sub: "Local registry",
            bar: null,
        },
        {
            href: "/dashboard/volumes",
            icon: BoxIcon,
            value: volumes.length,
            label: "Volumes",
            tooltip: "Persistent storage attached to containers",
            sub: "Persistent storage",
            bar: null,
        },
        {
            href: "/dashboard/networks",
            icon: NetworkIcon,
            value: networks.length,
            label: "Networks",
            tooltip: "Docker networks for container isolation",
            sub: "Project isolation",
            bar: null,
        },
    ]);
</script>

<div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
    {#each statCards as card}
        <Tooltip.Provider delayDuration={300}>
            <Tooltip.Root>
                <Tooltip.Trigger class="text-left w-full">
                    <a
                            href={card.href}
                            class="bg-card border rounded-xl p-4 hover:border-primary/40 transition-all group flex flex-col"
                    >
                        <div class="flex items-start justify-between mb-3">
                            <div class="bg-muted rounded-lg p-1.5">
                                <card.icon class="size-3.5 text-muted-foreground" />
                            </div>
                            <div class="flex items-center gap-1">
                                <InfoIcon
                                        class="size-3 text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors"
                                />
                                <ChevronRightIcon
                                        class="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            </div>
                        </div>
                        {#if isPending}
                            <div class="h-7 bg-muted rounded animate-pulse w-10 mb-1"></div>
                            <div class="h-3 bg-muted rounded animate-pulse w-20"></div>
                        {:else}
                            <div class="text-2xl font-bold tabular-nums">{card.value}</div>
                            <div class="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                            {#if card.bar !== null}
                                <div class="flex gap-0.5 h-0.5 rounded-full overflow-hidden mt-2.5 bg-muted">
                                    <div class="bg-green-500 transition-all" style="width: {card.bar * 100}%"></div>
                                </div>
                            {/if}
                            <div class="text-xs mt-1.5 text-muted-foreground">{card.sub}</div>
                        {/if}
                    </a>
                </Tooltip.Trigger>
                <Tooltip.Content class="text-xs max-w-48">{card.tooltip}</Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    {/each}
</div>