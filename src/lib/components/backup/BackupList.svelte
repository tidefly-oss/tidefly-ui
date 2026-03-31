<script lang="ts">
import { DatabaseIcon, DownloadIcon, Loader } from "@lucide/svelte";
import { createMutation, createQuery } from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { backupApi } from "$lib/api/v1/backup";
import { Button } from "$lib/components/ui/button/index.js";

const backupsQuery = createQuery(() => ({
	queryKey: ["backups"],
	queryFn: () => backupApi.listBackups(),
}));

const backups = $derived(backupsQuery.data ?? []);

const downloadMutation = createMutation(() => ({
	mutationFn: (id: number) => backupApi.getDownloadUrl(id),
	onSuccess: (data) => {
		window.open(data.url, "_blank");
	},
	onError: () => toast.error("Failed to get download URL"),
}));

function formatBytes(bytes: number) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function statusColor(status: string) {
	return status === "completed"
		? "text-green-500"
		: status === "failed"
			? "text-destructive"
			: "text-amber-500";
}
</script>

<div class="rounded-xl border bg-card divide-y">
    <div class="px-5 py-4 flex items-center gap-3">
        <DatabaseIcon class="size-4 text-muted-foreground" />
        <div>
            <h2 class="text-sm font-semibold">Backup History</h2>
            <p class="text-xs text-muted-foreground mt-0.5">All completed and failed backup jobs</p>
        </div>
        <span class="ml-auto text-xs text-muted-foreground">{backups.length} total</span>
    </div>

    {#if backupsQuery.isPending}
        {#each Array(3) as _, i (i)}
            <div class="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div class="h-3.5 bg-muted rounded w-32"></div>
                <div class="h-3 bg-muted rounded w-20"></div>
                <div class="h-3 bg-muted rounded w-16 ml-auto"></div>
            </div>
        {/each}
    {:else if backups.length === 0}
        <div class="px-5 py-12 text-center text-sm text-muted-foreground">
            No backups yet — create your first backup below.
        </div>
    {:else}
        {#each backups as backup (backup.id)}
            <div class="px-5 py-3.5 flex items-center gap-4">
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="text-sm font-mono truncate">{backup.s3_key?.split("/").pop() ?? "—"}</span>
                        <span class="text-xs {statusColor(backup.status)} capitalize">{backup.status}</span>
                    </div>
                    <div class="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{backup.type}</span>
                        {#if backup.size_bytes > 0}
                            <span>{formatBytes(backup.size_bytes)}</span>
                        {/if}
                        <span>{formatDate(backup.created_at)}</span>
                    </div>
                    {#if backup.error}
                        <p class="text-xs text-destructive mt-0.5 truncate">{backup.error}</p>
                    {/if}
                </div>

                {#if backup.status === "completed"}
                    <Button
                            variant="outline"
                            size="sm"
                            class="shrink-0 gap-1.5"
                            disabled={downloadMutation.isPending && downloadMutation.variables === backup.id}
                            onclick={() => downloadMutation.mutate(backup.id)}
                    >
                        {#if downloadMutation.isPending && downloadMutation.variables === backup.id}
                            <Loader class="size-3.5 animate-spin" />
                        {:else}
                            <DownloadIcon class="size-3.5" />
                        {/if}
                        Download
                    </Button>
                {/if}
            </div>
        {/each}
    {/if}
</div>