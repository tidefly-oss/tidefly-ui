<script lang="ts">
import { CheckIcon, CloudIcon, Loader } from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { backupApi } from "$lib/api/v1/backup";
import { Button } from "$lib/components/ui/button/index.js";
import { Checkbox } from "$lib/components/ui/checkbox";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";

const qc = useQueryClient();

const configQuery = createQuery(() => ({
	queryKey: ["backups-config"],
	queryFn: () => backupApi.getConfig(),
}));

const saveMutation = createMutation(() => ({
	mutationFn: (data: Parameters<typeof backupApi.saveConfig>[0]) => backupApi.saveConfig(data),
	onSuccess: () => {
		qc.invalidateQueries({ queryKey: ["backups-config"] });
		toast.success("S3 config saved");
	},
	onError: () => toast.error("Failed to save config"),
}));

const testMutation = createMutation(() => ({
	mutationFn: () => backupApi.testConnection(),
	onSuccess: (data) => {
		if (data.ok) toast.success(data.message);
		else toast.error(data.message);
	},
	onError: () => toast.error("Connection test failed"),
}));

let endpoint = $state("");
let bucket = $state("");
let region = $state("us-east-1");
let accessKey = $state("");
let secretKey = $state("");
let useSSL = $state(true);
let pathStyle = $state(false);
let prefix = $state("backups");

$effect(() => {
	const cfg = configQuery.data;
	if (cfg?.configured) {
		endpoint = cfg.endpoint;
		bucket = cfg.bucket;
		region = cfg.region;
		useSSL = cfg.use_ssl;
		pathStyle = cfg.path_style;
		prefix = cfg.prefix;
	}
});

function save() {
	saveMutation.mutate({
		endpoint,
		bucket,
		region,
		access_key: accessKey,
		secret_key: secretKey,
		use_ssl: useSSL,
		path_style: pathStyle,
		prefix,
	});
}
</script>

<div class="rounded-xl border bg-card divide-y">
    <div class="px-5 py-4 flex items-center gap-3">
        <CloudIcon class="size-4 text-muted-foreground" />
        <div>
            <h2 class="text-sm font-semibold">S3 Storage</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
                Compatible with AWS S3, Cloudflare R2, Backblaze B2, Minio and any S3-compatible endpoint.
            </p>
        </div>
        {#if configQuery.data?.configured}
            <span class="ml-auto flex items-center gap-1 text-xs text-green-500">
                <CheckIcon class="size-3" /> Configured
            </span>
        {/if}
    </div>

    {#if configQuery.isPending}
        <div class="px-5 py-6 space-y-5 animate-pulse">
            {#each Array(4) as _, i (i)}
                <div class="space-y-2">
                    <div class="h-3 bg-muted rounded w-24"></div>
                    <div class="h-9 bg-muted rounded w-full"></div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="px-5 py-5 space-y-4">
            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <Label for="s3-endpoint">Endpoint</Label>
                    <Input id="s3-endpoint" bind:value={endpoint} placeholder="s3.amazonaws.com" />
                    <p class="text-xs text-muted-foreground">Leave default for AWS, set custom for Minio/R2</p>
                </div>
                <div class="space-y-1.5">
                    <Label for="s3-bucket">Bucket</Label>
                    <Input id="s3-bucket" bind:value={bucket} placeholder="my-tidefly-backups" />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <Label for="s3-access-key">Access Key</Label>
                    <Input id="s3-access-key" bind:value={accessKey} placeholder="AKIAIOSFODNN7EXAMPLE" />
                </div>
                <div class="space-y-1.5">
                    <Label for="s3-secret-key">Secret Key</Label>
                    <Input id="s3-secret-key" bind:value={secretKey} type="password" placeholder="••••••••••••" />
                </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
                <div class="space-y-1.5">
                    <Label for="s3-region">Region</Label>
                    <Input id="s3-region" bind:value={region} placeholder="us-east-1" />
                </div>
                <div class="space-y-1.5">
                    <Label for="s3-prefix">Prefix</Label>
                    <Input id="s3-prefix" bind:value={prefix} placeholder="backups" />
                </div>
                <div class="space-y-3 pt-1">
                    <Label>Options</Label>
                    <div class="flex flex-col gap-2">
                        <div class="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox bind:checked={useSSL} class="rounded" />
                            Use SSL
                        </div>
                        <div class="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox bind:checked={pathStyle} class="rounded" />
                            Path-style (Minio)
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="px-5 py-3.5 flex items-center justify-between">
            <Button
                    variant="outline"
                    size="sm"
                    onclick={() => testMutation.mutate()}
                    disabled={testMutation.isPending || !endpoint || !bucket}
            >
                {#if testMutation.isPending}
                    <Loader class="size-3.5 mr-1.5 animate-spin" />
                {/if}
                Test Connection
            </Button>
            <Button size="sm" onclick={save} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving…" : "Save"}
            </Button>
        </div>
    {/if}
</div>