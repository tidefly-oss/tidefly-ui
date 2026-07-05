<script lang="ts">
    import { GlobeIcon, RouteIcon, TriangleAlertIcon } from "@lucide/svelte";
    import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
    import { toast } from "svelte-sonner";
    import { adminApi } from "$lib/api/v1/admin";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import * as Tooltip from "$lib/components/ui/tooltip/index.js";

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
    let traefikBaseDomain = $state("");
    let apiDocsEnabled = $state(false);
    let traefikDashboardEnabled = $state(false);

    $effect(() => {
        if (settings) {
            instanceName = settings.instance_name ?? "";
            traefikBaseDomain = settings.traefik_base_domain ?? "";
            apiDocsEnabled = settings.api_docs_enabled ?? false;
            traefikDashboardEnabled = settings.traefik_dashboard_enabled ?? false;
        }
    });

    function save() {
        updateMutation.mutate({
            instance_name: instanceName,
            traefik_base_domain: traefikBaseDomain,
        });
    }

    function saveApiDocs() {
        updateMutation.mutate({ api_docs_enabled: apiDocsEnabled });
    }

    function saveTraefikDashboard() {
        updateMutation.mutate({ traefik_dashboard_enabled: traefikDashboardEnabled });
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
                            bind:value={traefikBaseDomain}
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

    <!-- API Docs -->
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-4">
            <h2 class="text-sm font-semibold">API Documentation</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Control access to the OpenAPI/Swagger UI</p>
        </div>

        {#if !settingsQuery.isPending}
            <div class="px-5 py-5">
                <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium">Enable Swagger UI</span>
                            <Tooltip.Root>
                                <Tooltip.Trigger aria-label="Security warning">
                                    <div class="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 cursor-default">
                                        <TriangleAlertIcon class="size-2.5" />
                                        No auth
                                    </div>
                                </Tooltip.Trigger>
                                <Tooltip.Content class="max-w-56 text-xs">
                                    The Swagger UI at <span class="font-mono">/docs</span> is publicly accessible without authentication. Disable this in production environments.
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            Exposes the interactive API reference at <span class="font-mono">/docs</span>. Anyone with network access can view and call all API endpoints.
                        </p>
                    </div>
                    <button
                            role="switch"
                            aria-checked={apiDocsEnabled}
                            aria-label="Enable Swagger UI"
                            onclick={() => { apiDocsEnabled = !apiDocsEnabled; saveApiDocs(); }}
                            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 {apiDocsEnabled ? 'bg-primary' : 'bg-input'}"
                    >
                        <span
                                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {apiDocsEnabled ? 'translate-x-4' : 'translate-x-0'}"
                        ></span>
                    </button>
                </div>
            </div>
        {/if}
    </div>

    <!-- Traefik Dashboard -->
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-4 flex items-center gap-3">
            <RouteIcon class="size-4 text-muted-foreground" />
            <div>
                <h2 class="text-sm font-semibold">Traefik Dashboard</h2>
                <p class="text-xs text-muted-foreground mt-0.5">Expose the reverse-proxy dashboard, protected by your Tidefly login</p>
            </div>
        </div>

        {#if !settingsQuery.isPending}
            <div class="px-5 py-5">
                <div class="flex items-start justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium">Enable Traefik Dashboard</span>
                            <Tooltip.Root>
                                <Tooltip.Trigger aria-label="Exposure info">
                                    <div class="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 cursor-default">
                                        <TriangleAlertIcon class="size-2.5" />
                                        Exposed
                                    </div>
                                </Tooltip.Trigger>
                                <Tooltip.Content class="max-w-56 text-xs">
                                    Publishes the Traefik dashboard on the
                                    <span class="font-mono">traefik.</span> subdomain. Access requires a valid Tidefly login. Takes effect within a few seconds.
                                </Tooltip.Content>
                            </Tooltip.Root>
                        </div>
                        <p class="text-xs text-muted-foreground">
                            Serves Traefik's routing dashboard at
                            {#if traefikBaseDomain}
                                <span class="font-mono">traefik.{traefikBaseDomain}</span>
                            {:else}
                                the <span class="font-mono">traefik.</span> subdomain
                            {/if}
                            — only reachable while you're signed in. Off by default.
                        </p>
                    </div>
                    <button
                            role="switch"
                            aria-checked={traefikDashboardEnabled}
                            aria-label="Enable Traefik Dashboard"
                            onclick={() => { traefikDashboardEnabled = !traefikDashboardEnabled; saveTraefikDashboard(); }}
                            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 {traefikDashboardEnabled ? 'bg-primary' : 'bg-input'}"
                    >
                        <span
                                class="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform {traefikDashboardEnabled ? 'translate-x-4' : 'translate-x-0'}"
                        ></span>
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>