<script lang="ts">
import { GlobeIcon } from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { adminApi } from "$lib/api/v1/admin";
import { Button } from "$lib/components/ui/button/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";

const qc = useQueryClient();

const settingsQuery = createQuery(() => ({
	queryKey: ["admin-settings"],
	queryFn: () => adminApi.getSettings(),
}));

const updateMutation = createMutation(() => ({
	mutationFn: (data: Record<string, unknown>) => adminApi.updateSettings(data),
	onSuccess: () => {
		qc.invalidateQueries({ queryKey: ["admin-settings"] });
		toast.success("Settings saved");
	},
	onError: () => toast.error("Failed to save settings"),
}));

const settings = $derived(settingsQuery.data ?? null);

let instanceName = $state("");
let caddyBaseDomain = $state("");

$effect(() => {
	if (settings) {
		instanceName = settings.instance_name ?? "";
		caddyBaseDomain = settings.caddy_base_domain ?? "";
	}
});

function save() {
	updateMutation.mutate({
		instance_name: instanceName,
		caddy_base_domain: caddyBaseDomain,
	});
}
</script>

<div class="space-y-4">
    <!-- General -->
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-4">
            <h2 class="text-sm font-semibold">General</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Basic instance configuration</p>
        </div>

        {#if settingsQuery.isPending}
            <div class="px-5 py-6 space-y-5">
                {#each Array(2) as _, i (i)}
                    <div class="space-y-2 animate-pulse">
                        <div class="h-3 bg-muted rounded w-24"></div>
                        <div class="h-9 bg-muted rounded w-full"></div>
                    </div>
                {/each}
            </div>
        {:else}
            <div class="px-5 py-5">
                <div class="space-y-1.5">
                    <Label for="instance-name">Instance Name</Label>
                    <Input id="instance-name" bind:value={instanceName} placeholder="My Tidefly" />
                    <p class="text-xs text-muted-foreground">Displayed in the UI and outgoing emails</p>
                </div>
            </div>
            <div class="px-5 py-3.5 flex justify-end">
                <Button onclick={save} disabled={updateMutation.isPending} size="sm">
                    {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
            </div>
        {/if}
    </div>

    <!-- Proxy / Domain -->
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-4 flex items-center gap-3">
            <GlobeIcon class="size-4 text-muted-foreground" />
            <div>
                <h2 class="text-sm font-semibold">Proxy Domain</h2>
                <p class="text-xs text-muted-foreground mt-0.5">
                    Base domain for this Control Plane — deployed services get subdomains like
                    <span class="font-mono">myapp.yourdomain.com</span>
                </p>
            </div>
        </div>

        {#if !settingsQuery.isPending}
            <div class="px-5 py-5 space-y-5">
                <div class="space-y-1.5">
                    <Label for="caddy-domain">Base Domain</Label>
                    <Input
                            id="caddy-domain"
                            bind:value={caddyBaseDomain}
                            placeholder="apps.example.com"
                    />
                    <p class="text-xs text-muted-foreground">
                        Point a wildcard DNS record <span class="font-mono">*.apps.example.com → server IP</span> before changing this.
                        This only affects the Control Plane — Worker nodes manage their own routing.
                    </p>
                </div>

                <div class="rounded-lg bg-muted/50 border px-4 py-3 text-xs text-muted-foreground space-y-1">
                    <p class="font-medium text-foreground">⚠ This is the Control Plane domain only</p>
                    <p>Services deployed on Worker nodes use the Worker's own domain configuration. Changes here only affect services on this machine.</p>
                </div>
            </div>

            <div class="px-5 py-3.5 flex justify-end">
                <Button onclick={save} disabled={updateMutation.isPending} size="sm">
                    {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
            </div>
        {/if}
    </div>
</div>