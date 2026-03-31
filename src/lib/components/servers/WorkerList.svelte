<script lang="ts">
import {
	CpuIcon,
	Loader,
	MemoryStickIcon,
	PlusIcon,
	ServerIcon,
	ShieldCheckIcon,
	TerminalIcon,
	Trash2Icon,
	XIcon,
} from "@lucide/svelte";
import { createMutation } from "@tanstack/svelte-query";
import { goto } from "$app/navigation";
import { agentApi, type WorkerNode } from "$lib/api/v1/agent/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Dialog from "$lib/components/ui/dialog/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";

interface Props {
	workers: WorkerNode[];
	isLoading: boolean;
	onAddServer: () => void;
	onWorkerRevoked: () => void;
}

const { workers, isLoading, onAddServer, onWorkerRevoked }: Props = $props();

let revokeTarget = $state<WorkerNode | null>(null);
const revokeMutation = createMutation(() => ({
	mutationFn: (id: string) => agentApi.revokeWorker(id),
	onSuccess: () => {
		onWorkerRevoked();
		revokeTarget = null;
	},
}));

let deleteTarget = $state<WorkerNode | null>(null);
const deleteMutation = createMutation(() => ({
	mutationFn: (id: string) => agentApi.deleteWorker(id),
	onSuccess: () => {
		onWorkerRevoked();
		deleteTarget = null;
	},
}));

function statusDot(status: WorkerNode["status"]) {
	return (
		{
			connected: "bg-green-500",
			pending: "bg-amber-500 animate-pulse",
			disconnected: "bg-muted-foreground/40",
			revoked: "bg-destructive/50",
		}[status] ?? "bg-muted-foreground/40"
	);
}
function statusText(status: WorkerNode["status"]) {
	return (
		{
			connected: "text-green-500",
			pending: "text-amber-500",
			disconnected: "text-muted-foreground",
			revoked: "text-destructive/70",
		}[status] ?? "text-muted-foreground"
	);
}
function statusLabel(status: WorkerNode["status"]) {
	return (
		{ connected: "Connected", pending: "Pending", disconnected: "Offline", revoked: "Revoked" }[
			status
		] ?? status
	);
}
function timeAgo(dateStr: string | null) {
	if (!dateStr) return "never";
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60_000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}
function shortName(name: string) {
	if (name.length > 32) return `${name.slice(0, 28)}…`;
	return name;
}
function metricColor(pct: number) {
	if (pct >= 90) return "text-destructive";
	if (pct >= 70) return "text-amber-500";
	return "text-foreground";
}
function fmtPct(pct: number) {
	return `${pct.toFixed(1)}%`;
}
</script>

<div class="bg-card border rounded-xl overflow-hidden">
    <div class="flex items-center justify-between px-5 py-3.5 border-b bg-muted/20">
        <div class="flex items-center gap-2.5">
            <h2 class="font-medium text-sm">Worker Nodes</h2>
            {#if !isLoading}
                <span class="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5 tabular-nums">
                    {workers.filter((w) => w.status === "connected").length}/{workers.length} online
                </span>
            {/if}
        </div>
        <Tooltip.Provider delayDuration={100}>
            <Tooltip.Root>
                <Tooltip.Trigger>
                    <div class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-default px-2 py-1 rounded-md hover:bg-muted">
                        <ShieldCheckIcon class="size-3.5 text-primary/70" />
                        <span>mTLS</span>
                    </div>
                </Tooltip.Trigger>
                <Tooltip.Content class="max-w-64 text-xs leading-relaxed" side="bottom" align="end">
                    All Plane ↔ Worker communication is encrypted with mutual TLS.
                    Certificates are issued by the Tidefly internal CA and auto-renewed 30 days before expiry.
                    Revoking a worker immediately invalidates its certificate.
                </Tooltip.Content>
            </Tooltip.Root>
        </Tooltip.Provider>
    </div>

    {#if !isLoading && workers.length > 0}
        <div class="grid grid-cols-[2.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-2 border-b">
            <span class="text-xs text-muted-foreground">Server</span>
            <span class="text-xs text-muted-foreground">CPU</span>
            <span class="text-xs text-muted-foreground">Memory</span>
            <span class="text-xs text-muted-foreground">Last seen</span>
            <span class="w-16"></span>
        </div>
    {/if}

    <div class="divide-y">
        {#if isLoading}
            {#each Array(2) as _, i (i)}
                <div class="grid grid-cols-[2.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center animate-pulse">
                    <div class="flex items-center gap-3">
                        <div class="size-8 rounded-lg bg-muted shrink-0"></div>
                        <div class="space-y-1.5">
                            <div class="h-3.5 bg-muted rounded w-36"></div>
                            <div class="h-3 bg-muted rounded w-48"></div>
                        </div>
                    </div>
                    {#each Array(3) as __, j (j)}
                        <div class="h-3 bg-muted rounded w-14"></div>
                    {/each}
                    <div class="w-16"></div>
                </div>
            {/each}

        {:else if workers.length === 0}
            <div class="px-5 py-16 flex flex-col items-center gap-3 text-center">
                <div class="bg-muted rounded-full p-4">
                    <ServerIcon class="size-7 text-muted-foreground" />
                </div>
                <div>
                    <p class="font-medium text-sm">No servers connected</p>
                    <p class="text-xs text-muted-foreground mt-1">Add a server to deploy containers across multiple machines</p>
                </div>
                <Button size="sm" onclick={onAddServer}>
                    <PlusIcon class="size-3.5 mr-1.5" /> Add Server
                </Button>
            </div>

        {:else}
            {#each workers as worker (worker.id)}
                {@const isRevoked = worker.status === "revoked"}
                {@const isConnected = worker.status === "connected"}
                <div class="grid grid-cols-[2.5fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center group hover:bg-muted/20 transition-colors {isRevoked ? 'opacity-50' : ''}">

                    <!-- Server info -->
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="bg-muted rounded-lg p-1.5 shrink-0">
                            <ServerIcon class="size-4 text-muted-foreground" />
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-2 flex-wrap">
                                <Tooltip.Provider delayDuration={400}>
                                    <Tooltip.Root>
                                        <Tooltip.Trigger class="text-left">
                                            <span class="font-medium text-sm">{shortName(worker.name)}</span>
                                        </Tooltip.Trigger>
                                        {#if worker.name.length > 32}
                                            <Tooltip.Content class="font-mono text-xs">{worker.name}</Tooltip.Content>
                                        {/if}
                                    </Tooltip.Root>
                                </Tooltip.Provider>
                                <span class="flex items-center gap-1 shrink-0">
                                    <span class="size-1.5 rounded-full {statusDot(worker.status)}"></span>
                                    <span class="text-xs {statusText(worker.status)}">{statusLabel(worker.status)}</span>
                                </span>
                            </div>
                            <div class="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                {#if worker.last_seen_ip}
                                    <span class="font-mono">{worker.last_seen_ip}</span>
                                {/if}
                                {#if worker.os && worker.arch}
                                    <span>{worker.os}/{worker.arch}</span>
                                {/if}
                                {#if worker.runtime_type}
                                    <span class="capitalize">{worker.runtime_type}</span>
                                {/if}
                                {#if worker.agent_version}
                                    <span class="font-mono">v{worker.agent_version}</span>
                                {/if}
                            </div>
                        </div>
                    </div>

                    <!-- CPU -->
                    <div class="flex items-center gap-1.5 text-xs">
                        <CpuIcon class="size-3.5 shrink-0 text-muted-foreground" />
                        {#if isConnected}
                            <span class="tabular-nums {metricColor(worker.cpu_percent)}">{fmtPct(worker.cpu_percent)}</span>
                        {:else}
                            <span class="text-muted-foreground">—</span>
                        {/if}
                    </div>

                    <!-- Memory -->
                    <div class="flex items-center gap-1.5 text-xs">
                        <MemoryStickIcon class="size-3.5 shrink-0 text-muted-foreground" />
                        {#if isConnected}
                            <span class="tabular-nums {metricColor(worker.mem_percent)}">{fmtPct(worker.mem_percent)}</span>
                        {:else}
                            <span class="text-muted-foreground">—</span>
                        {/if}
                    </div>

                    <!-- Last seen -->
                    <span class="text-xs text-muted-foreground tabular-nums">{timeAgo(worker.last_seen_at)}</span>

                    <!-- Actions -->
                    <div class="w-16 flex items-center justify-end gap-1">
                        {#if isConnected}
                            <Tooltip.Provider delayDuration={200}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button
                                                variant="ghost"
                                                size="icon"
                                                class="size-7 text-muted-foreground hover:text-foreground"
                                                onclick={() => goto(`/dashboard/servers/${worker.id}/logs`)}
                                        >
                                            <TerminalIcon class="size-3.5" />
                                        </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>View Logs</Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        {/if}
                        {#if isRevoked}
                            <Tooltip.Provider delayDuration={200}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button variant="ghost" size="icon" class="size-7 text-muted-foreground hover:text-destructive" onclick={() => (deleteTarget = worker)}>
                                            <XIcon class="size-3.5" />
                                        </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Delete</Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        {:else}
                            <Tooltip.Provider delayDuration={200}>
                                <Tooltip.Root>
                                    <Tooltip.Trigger>
                                        <Button variant="ghost" size="icon" class="size-7 text-muted-foreground hover:text-destructive" onclick={() => (revokeTarget = worker)}>
                                            <Trash2Icon class="size-3.5" />
                                        </Button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Content>Revoke</Tooltip.Content>
                                </Tooltip.Root>
                            </Tooltip.Provider>
                        {/if}
                    </div>
                </div>
            {/each}
        {/if}
    </div>
</div>

<!-- Revoke Dialog -->
<Dialog.Root open={!!revokeTarget} onOpenChange={(v) => { if (!v) revokeTarget = null; }}>
    <Dialog.Content class="max-w-sm">
        <Dialog.Header>
            <Dialog.Title>Revoke Server</Dialog.Title>
            <Dialog.Description>
                Revoke <strong>{revokeTarget?.name}</strong>?
                The agent will be disconnected and its mTLS certificate immediately invalidated.
                The entry stays visible until permanently deleted.
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Button variant="outline" onclick={() => (revokeTarget = null)}>Cancel</Button>
            <Button variant="destructive" disabled={revokeMutation.isPending} onclick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}>
                {#if revokeMutation.isPending}<Loader class="size-4 mr-2 animate-spin" />{/if}
                Revoke
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>

<!-- Delete Dialog -->
<Dialog.Root open={!!deleteTarget} onOpenChange={(v) => { if (!v) deleteTarget = null; }}>
    <Dialog.Content class="max-w-sm">
        <Dialog.Header>
            <Dialog.Title>Delete Server</Dialog.Title>
            <Dialog.Description>
                Permanently remove <strong>{deleteTarget?.name}</strong> from the list?
                This only deletes the record — the certificate is already revoked.
            </Dialog.Description>
        </Dialog.Header>
        <Dialog.Footer>
            <Button variant="outline" onclick={() => (deleteTarget = null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onclick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>
                {#if deleteMutation.isPending}<Loader class="size-4 mr-2 animate-spin" />{/if}
                Delete
            </Button>
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>