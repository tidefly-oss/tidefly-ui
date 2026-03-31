<script lang="ts">
import {
	CircleIcon,
	HardDriveIcon,
	NetworkIcon,
	PlayIcon,
	RotateCcwIcon,
	SquareIcon,
	Trash2Icon,
} from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import { containersApi } from "$lib/api/v1/containers/index.js";
import type { ContainerDetails, ContainerStatus } from "$lib/api/v1/types/index.js";
import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { auth } from "$lib/stores/auth.svelte";
import ContainerLogs from "./ContainerLogs.svelte";
import ContainerResourceLimits from "./ContainerResourceLimits.svelte";
import ContainerStats from "./ContainerStats.svelte";
import ContainerTerminalPanel from "./ContainerTerminalPanel.svelte";

let { initialData }: { initialData: ContainerDetails } = $props();

const queryClient = useQueryClient();

const isAdmin = $derived(auth.user?.role === "admin");

const query = createQuery(() => ({
	queryKey: ["container", initialData.id],
	queryFn: () => containersApi.get(initialData.id),
	initialData,
}));

const actionMutation = createMutation(() => ({
	mutationFn: async (action: "start" | "stop" | "restart" | "delete") => {
		if (action === "start") return containersApi.start(initialData.id);
		if (action === "stop") return containersApi.stop(initialData.id);
		if (action === "restart") return containersApi.restart(initialData.id);
		await containersApi.delete(initialData.id, true);
		return { status: "exited" as ContainerStatus };
	},
	onSuccess: (_, action) => {
		if (action === "delete") {
			queryClient.invalidateQueries({ queryKey: ["containers"] });
			goto("/dashboard/containers");
			return;
		}
		const statusMap: Record<string, ContainerStatus> = {
			start: "running",
			stop: "exited",
			restart: "running",
		};
		queryClient.setQueryData<ContainerDetails>(
			["container", initialData.id],
			(old: ContainerDetails | undefined) => (old ? { ...old, status: statusMap[action] } : old)
		);
		queryClient.invalidateQueries({ queryKey: ["container", initialData.id] });
	},
}));

type Tab = "overview" | "logs" | "stats" | "resources" | "terminal";
const validTabs: Tab[] = ["overview", "logs", "stats", "resources", "terminal"];

function getInitialTab(): Tab {
	const t = $page.url.searchParams.get("tab") as Tab;
	return validTabs.includes(t) ? t : "overview";
}

let tab = $state<Tab>(getInitialTab());

const container = $derived(query.data ?? initialData);

// canDelete must be after container
const canDelete = $derived(
	isAdmin || !!container.labels?.["tidefly.project"] || !!container.labels?.["tidefly.service"]
);

const statusDot: Record<ContainerStatus, string> = {
	running: "#22c55e",
	stopped: "#6b7280",
	exited: "#6b7280",
	paused: "#f59e0b",
	created: "#3b82f6",
};

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("de-DE");
}
</script>

<div class="space-y-4">
    {#if query.isPending && !initialData}
        <div class="bg-card border rounded-xl p-6 animate-pulse space-y-3">
            <div class="h-5 bg-muted rounded w-48"></div>
            <div class="h-3 bg-muted rounded w-32"></div>
        </div>
    {:else if query.isError}
        <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
            {query.error.message}
        </div>
    {:else}
        <!-- Header -->
        <div class="bg-card border rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div class="flex items-center gap-3">
                <CircleIcon
                        class="size-2.5 fill-current shrink-0"
                        style="color: {statusDot[container.status]}"
                />
                <div>
                    <h1 class="font-semibold">{container.name}</h1>
                    <p class="text-xs text-muted-foreground mt-0.5 font-mono">
                        {container.id} · {container.image}
                    </p>
                </div>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
                {#if container.status === "running"}
                    <Button variant="outline" size="sm" disabled={actionMutation.isPending}
                            onclick={() => actionMutation.mutate("stop")}>
                        <SquareIcon class="size-3 mr-1.5" /> Stop
                    </Button>
                    <Button variant="outline" size="sm" disabled={actionMutation.isPending}
                            onclick={() => actionMutation.mutate("restart")}>
                        <RotateCcwIcon class="size-3 mr-1.5" /> Restart
                    </Button>
                {:else}
                    <Button variant="outline" size="sm" disabled={actionMutation.isPending}
                            onclick={() => actionMutation.mutate("start")}>
                        <PlayIcon class="size-3 mr-1.5" /> Start
                    </Button>
                {/if}

                {#if canDelete}
                    <AlertDialog.Root>
                        <AlertDialog.Trigger>
                            {#snippet child({ props })}
                                <Button {...props} variant="destructive" size="sm"
                                        disabled={actionMutation.isPending}>
                                    <Trash2Icon class="size-3 mr-1.5" /> Delete
                                </Button>
                            {/snippet}
                        </AlertDialog.Trigger>
                        <AlertDialog.Content>
                            <AlertDialog.Header>
                                <AlertDialog.Title>Delete "{container.name}"?</AlertDialog.Title>
                                <AlertDialog.Description>
                                    This will permanently remove the container. Any data not stored in a volume will be lost.
                                </AlertDialog.Description>
                            </AlertDialog.Header>
                            <AlertDialog.Footer>
                                <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                <AlertDialog.Action
                                        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        onclick={() => actionMutation.mutate("delete")}>
                                    Delete
                                </AlertDialog.Action>
                            </AlertDialog.Footer>
                        </AlertDialog.Content>
                    </AlertDialog.Root>
                {/if}
            </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b">
            {#each [["overview","Overview"],["logs","Logs"],["stats","Stats"],["resources","Resources"],["terminal","Terminal"]] as [t, label] (t)}
                <button
                        onclick={() => (tab = t as Tab)}
                        class="px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px {tab === t
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted-foreground hover:text-foreground'}"
                >
                    {label}
                </button>
            {/each}
        </div>

        <!-- Tab Content -->
        {#if tab === "overview"}
            <div class="grid gap-4 lg:grid-cols-2">
                <div class="bg-card border rounded-xl overflow-hidden">
                    <div class="px-4 py-3 border-b"><h2 class="text-sm font-medium">Details</h2></div>
                    <div class="divide-y text-sm">
                        <div class="px-4 py-2.5 flex justify-between gap-4">
                            <span class="text-muted-foreground">Status</span>
                            <span class="font-medium capitalize">{container.status}</span>
                        </div>
                        <div class="px-4 py-2.5 flex justify-between gap-4">
                            <span class="text-muted-foreground">Image</span>
                            <span class="font-mono text-xs truncate max-w-48">{container.image}</span>
                        </div>
                        {#if container.command}
                            <div class="px-4 py-2.5 flex justify-between gap-4">
                                <span class="text-muted-foreground">Command</span>
                                <span class="font-mono text-xs truncate max-w-48">{container.command}</span>
                            </div>
                        {/if}
                        <div class="px-4 py-2.5 flex justify-between gap-4">
                            <span class="text-muted-foreground">Created</span>
                            <span class="text-xs">{formatDate(container.created)}</span>
                        </div>
                        {#if container.restart_policy}
                            <div class="px-4 py-2.5 flex justify-between gap-4">
                                <span class="text-muted-foreground">Restart</span>
                                <span class="font-mono text-xs">{container.restart_policy}</span>
                            </div>
                        {/if}
                    </div>
                </div>

                <div class="bg-card border rounded-xl overflow-hidden">
                    <div class="px-4 py-3 border-b"><h2 class="text-sm font-medium">Ports</h2></div>
                    {#if !container.ports || container.ports.length === 0}
                        <div class="px-4 py-6 text-sm text-muted-foreground text-center">No ports exposed</div>
                    {:else}
                        <div class="divide-y text-sm">
                            {#each container.ports as p (p.container_port + p.protocol)}
                                <div class="px-4 py-2.5 flex items-center justify-between gap-4">
                                    <span class="font-mono text-xs">{p.container_port}/{p.protocol}</span>
                                    <span class="text-muted-foreground text-xs">→ {p.host_ip || "0.0.0.0"}:{p.host_port}</span>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                {#if container.mounts && container.mounts.length > 0}
                    <div class="bg-card border rounded-xl overflow-hidden">
                        <div class="px-4 py-3 border-b"><h2 class="text-sm font-medium">Volumes</h2></div>
                        <div class="divide-y text-xs font-mono">
                            {#each container.mounts as m (m.source + m.destination)}
                                <div class="px-4 py-2.5 flex items-center gap-2">
                                    <HardDriveIcon class="size-3 text-muted-foreground shrink-0" />
                                    <a href="/dashboard/volumes?q={encodeURIComponent(m.source)}"
                                       class="text-amber-400 hover:underline truncate flex-1">{m.source}</a>
                                    <span class="text-muted-foreground">→</span>
                                    <span class="truncate text-muted-foreground">{m.destination}</span>
                                    {#if !m.rw}<span class="ml-auto text-amber-500 shrink-0">ro</span>{/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if container.networks && container.networks.length > 0}
                    <div class="bg-card border rounded-xl overflow-hidden">
                        <div class="px-4 py-3 border-b"><h2 class="text-sm font-medium">Networks</h2></div>
                        <div class="divide-y text-sm">
                            {#each container.networks as n (n)}
                                <div class="px-4 py-2.5 flex items-center gap-2">
                                    <NetworkIcon class="size-3 text-muted-foreground shrink-0" />
                                    <a href="/dashboard/networks?q={encodeURIComponent(n)}"
                                       class="font-mono text-xs text-blue-400 hover:underline">{n}</a>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}

                {#if container.env && container.env.length > 0}
                    <div class="bg-card border rounded-xl overflow-hidden lg:col-span-2">
                        <div class="px-4 py-3 border-b"><h2 class="text-sm font-medium">Environment</h2></div>
                        <div class="divide-y max-h-48 overflow-y-auto">
                            {#each container.env as e (e)}
                                {@const [key, ...rest] = e.split("=")}
                                <div class="px-4 py-2 flex items-center gap-4 text-xs font-mono">
                                    <span class="text-blue-400 shrink-0">{key}</span>
                                    <span class="text-muted-foreground truncate">{rest.join("=")}</span>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            </div>
        {:else if tab === "logs"}
            <ContainerLogs containerId={container.id} containerName={container.name} containerStatus={container.status} />
        {:else if tab === "stats"}
            <ContainerStats containerId={container.id} containerStatus={container.status} />
        {:else if tab === "resources"}
            <div class="max-w-lg">
                <div class="bg-card border rounded-xl overflow-hidden">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h2 class="text-sm font-medium">Resource Limits</h2>
                        {#if container.status !== "running"}
              <span class="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
                Container stopped — limits apply on next start
              </span>
                        {/if}
                    </div>
                    <div class="p-4">
                        <ContainerResourceLimits containerId={container.id} />
                    </div>
                </div>
            </div>
        {:else if tab === "terminal"}
            <ContainerTerminalPanel containerId={container.id} containerStatus={container.status} />
        {/if}
    {/if}
</div>