<script lang="ts">
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Label } from "$lib/components/ui/label/index.js";
    import { tokenStore } from "$lib/api/client";
    import { toast } from "svelte-sonner";
    import { DatabaseIcon, DownloadIcon, Loader } from "@lucide/svelte";

    let loading = $state(false);

    let dbName     = $state("");
    let dbHost     = $state("localhost");
    let dbPort     = $state("5432");
    let dbUser     = $state("postgres");
    let dbPassword = $state("");

    const isValid = $derived(
        dbName.trim().length > 0 &&
        dbUser.trim().length > 0 &&
        dbPassword.trim().length > 0
    );

    async function submit() {
        if (!isValid || loading) return;
        loading = true;

        try {
            const res = await fetch("/api/v1/backups/postgres/download", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${tokenStore.get()}`,
                },
                credentials: "include",
                body: JSON.stringify({
                    db_name:     dbName,
                    db_host:     dbHost,
                    db_port:     dbPort,
                    db_user:     dbUser,
                    db_password: dbPassword,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.detail ?? `HTTP ${res.status}`);
            }

            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = blobUrl;
            a.download = `${dbName}-${new Date().toISOString().slice(0, 10)}.dump`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);

            toast.success("Backup downloaded successfully");
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : "Backup failed");
        } finally {
            loading = false;
        }
    }
</script>

<div class="rounded-xl border bg-card divide-y">
    <div class="px-5 py-4 flex items-center gap-3">
        <DatabaseIcon class="size-4 text-muted-foreground" />
        <div>
            <h2 class="text-sm font-semibold">Create Postgres Backup</h2>
            <p class="text-xs text-muted-foreground mt-0.5">
                Runs <span class="font-mono">pg_dump</span> and downloads the backup directly.
            </p>
        </div>
    </div>

    <div class="px-5 py-5 space-y-4">
        <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
                <Label for="db-name">Database Name <span class="text-destructive">*</span></Label>
                <Input id="db-name" bind:value={dbName} placeholder="mydb" />
            </div>
            <div class="space-y-1.5">
                <Label for="db-host">Host</Label>
                <Input id="db-host" bind:value={dbHost} placeholder="localhost" />
            </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
            <div class="space-y-1.5">
                <Label for="db-port">Port</Label>
                <Input id="db-port" bind:value={dbPort} placeholder="5432" />
            </div>
            <div class="space-y-1.5">
                <Label for="db-user">User <span class="text-destructive">*</span></Label>
                <Input id="db-user" bind:value={dbUser} placeholder="postgres" />
            </div>
            <div class="space-y-1.5">
                <Label for="db-password">Password <span class="text-destructive">*</span></Label>
                <Input id="db-password" bind:value={dbPassword} type="password" placeholder="••••••••" />
            </div>
        </div>
    </div>

    <div class="px-5 py-3.5 flex justify-end">
        <Button size="sm" disabled={!isValid || loading} onclick={submit}>
            {#if loading}
                <Loader class="size-3.5 mr-1.5 animate-spin" />
                Creating backup…
            {:else}
                <DownloadIcon class="size-3.5 mr-1.5" />
                Download Backup
            {/if}
        </Button>
    </div>
</div>