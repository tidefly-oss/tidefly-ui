<script lang="ts">
import { CircleCheckBig, CircleIcon, EyeIcon, EyeOffIcon, FlaskConicalIcon } from "@lucide/svelte";
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
		toast.success("SMTP settings saved");
	},
	onError: () => toast.error("Failed to save SMTP settings"),
}));

const settings = $derived(settingsQuery.data ?? null);

// NOTE: backend field is smtp_username (not smtp_user)
let smtpHost = $state("");
let smtpPort = $state(587);
let smtpUsername = $state("");
let smtpPassword = $state("");
let smtpFrom = $state("");
let smtpTLS = $state(false);
let showPassword = $state(false);

$effect(() => {
	if (settings) {
		smtpHost = settings.smtp_host ?? "";
		smtpPort = settings.smtp_port ?? 587;
		smtpUsername = settings.smtp_username ?? "";
		smtpFrom = settings.smtp_from ?? "";
		smtpTLS = settings.smtp_tls_enabled ?? false;
		// password intentionally not pre-filled
	}
});

const isConfigured = $derived(!!settings?.smtp_host);

function save() {
	const data: Record<string, unknown> = {
		smtp_host: smtpHost,
		smtp_port: Number(smtpPort),
		smtp_username: smtpUsername, // matches backend field name
		smtp_from: smtpFrom,
		smtp_tls_enabled: smtpTLS,
	};
	if (smtpPassword) data.smtp_password = smtpPassword;
	updateMutation.mutate(data);
}

function clear() {
	updateMutation.mutate({
		smtp_host: "",
		smtp_port: 587,
		smtp_username: "",
		smtp_password: "",
		smtp_from: "",
		smtp_tls_enabled: false,
	});
	smtpHost = "";
	smtpPort = 587;
	smtpUsername = "";
	smtpPassword = "";
	smtpFrom = "";
	smtpTLS = false;
}

// Dev shortcut: fill Mailpit defaults
function fillMailpit() {
	smtpHost = "mailpit"; // service name in docker-compose
	smtpPort = 1025;
	smtpUsername = "";
	smtpPassword = "";
	smtpFrom = "noreply@tidefly-plane.local";
	smtpTLS = false;
	toast.info("Mailpit defaults filled — click Save Changes to apply");
}
</script>

<div class="rounded-xl border bg-card divide-y">
    <!-- Header -->
    <div class="px-5 py-4 flex items-center justify-between">
        <div>
            <h2 class="text-sm font-semibold">SMTP</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Outbound email for invites and notifications</p>
        </div>
        {#if isConfigured}
            <span class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                <CircleCheckBig class="size-3"/>
                Configured
            </span>
        {:else}
            <span class="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
                <CircleIcon class="size-3"/>
                Not configured
            </span>
        {/if}
    </div>

    <!-- Form skeleton -->
    {#if settingsQuery.isPending}
        <div class="px-5 py-6 space-y-5">
            {#each Array(4) as _, i (i)}
                <div class="space-y-2 animate-pulse">
                    <div class="h-3 bg-muted rounded w-20"></div>
                    <div class="h-9 bg-muted rounded w-full"></div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="px-5 py-5 space-y-4">
            <!-- Host + Port -->
            <div class="grid grid-cols-[1fr_100px] gap-3">
                <div class="space-y-1.5">
                    <Label for="smtp-host">Host</Label>
                    <Input id="smtp-host" bind:value={smtpHost} placeholder="smtp.example.com"/>
                </div>
                <div class="space-y-1.5">
                    <Label for="smtp-port">Port</Label>
                    <Input id="smtp-port" type="number" bind:value={smtpPort} placeholder="587"/>
                </div>
            </div>

            <!-- From -->
            <div class="space-y-1.5">
                <Label for="smtp-from">From Address</Label>
                <Input id="smtp-from" bind:value={smtpFrom} placeholder="noreply@example.com"/>
            </div>

            <!-- Username -->
            <div class="space-y-1.5">
                <Label for="smtp-username">Username</Label>
                <Input id="smtp-username" bind:value={smtpUsername} placeholder="smtp-user (optional)"
                       autocomplete="off"/>
            </div>

            <!-- Password -->
            <div class="space-y-1.5">
                <Label for="smtp-password">
                    Password
                    {#if isConfigured}
                        <span class="text-muted-foreground font-normal text-xs ml-1">(leave blank to keep current)</span>
                    {/if}
                </Label>
                <div class="relative">
                    <Input
                            id="smtp-password"
                            type={showPassword ? 'text' : 'password'}
                            bind:value={smtpPassword}
                            placeholder={isConfigured ? '••••••••' : 'Password (optional)'}
                            autocomplete="new-password"
                            class="pr-10"
                    />
                    <button
                            type="button"
                            onclick={() => showPassword = !showPassword}
                            class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {#if showPassword}
                            <EyeOffIcon class="size-4"/>
                        {:else}
                            <EyeIcon class="size-4"/>
                        {/if}
                    </button>
                </div>
            </div>

            <!-- TLS toggle -->
            <div class="flex items-center gap-3">
                <button
                        id="smtp-tls"
                        type="button"
                        role="switch"
                        aria-checked={smtpTLS}
                        onclick={() => smtpTLS = !smtpTLS}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        class="relative w-9 h-5 rounded-full transition-colors shrink-0 {smtpTLS ? 'bg-primary' : 'bg-muted border border-border'}"
                >
                    <div class="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform {smtpTLS ? 'translate-x-4' : ''}"></div>
                </button>
                <label for="smtp-tls" class="text-sm cursor-pointer select-none">
                    Enable TLS / STARTTLS
                </label>
            </div>
        </div>

        <!-- Footer actions -->
        <div class="px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap">
            <div class="flex items-center gap-2">
                <!-- Mailpit dev shortcut -->
                <Button variant="outline" size="sm" onclick={fillMailpit} class="gap-1.5 text-xs text-muted-foreground">
                    <FlaskConicalIcon class="size-3.5"/>
                    Use Mailpit
                </Button>

                {#if isConfigured}
                    <Button variant="ghost" size="sm" class="text-muted-foreground text-xs" onclick={clear}>
                        Clear
                    </Button>
                {/if}
            </div>

            <Button onclick={save} disabled={updateMutation.isPending} size="sm">
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
        </div>
    {/if}
</div>