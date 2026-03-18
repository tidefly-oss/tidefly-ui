<script lang="ts">
    import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import { adminApi } from '$lib/api/v1/admin';
    import { toast } from 'svelte-sonner';

    const qc = useQueryClient();

    const settingsQuery = createQuery(() => ({
        queryKey: ['admin-settings'],
        queryFn: () => adminApi.getSettings(),
    }));

    const updateMutation = createMutation(() => ({
        mutationFn: (data: Record<string, unknown>) => adminApi.updateSettings(data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['admin-settings'] });
            toast.success('Security settings saved');
        },
        onError: () => toast.error('Failed to save settings'),
    }));

    const settings = $derived(settingsQuery.data ?? null);
    let sessionTimeout = $state(24);

    $effect(() => {
        if (settings) sessionTimeout = settings.session_timeout_hours ?? 24;
    });

    function save() {
        updateMutation.mutate({ session_timeout_hours: sessionTimeout });
    }

    const presets = [
        { value: 1,   label: '1h' },
        { value: 8,   label: '8h' },
        { value: 24,  label: '1d' },
        { value: 72,  label: '3d' },
        { value: 168, label: '7d' },
    ] as const;
</script>

<div class="space-y-3">
    <div class="rounded-xl border bg-card divide-y">
        <div class="px-5 py-4">
            <h2 class="text-sm font-semibold">Security</h2>
            <p class="text-xs text-muted-foreground mt-0.5">Session and access control</p>
        </div>

        {#if settingsQuery.isPending}
            <div class="px-5 py-6 animate-pulse space-y-2">
                <div class="h-3 bg-muted rounded w-32"></div>
                <div class="h-9 bg-muted rounded w-36"></div>
            </div>
        {:else}
            <div class="px-5 py-5 space-y-3">
                <Label for="session-timeout">Session Timeout</Label>

                <!-- Preset chips -->
                <div class="flex gap-1.5 flex-wrap">
                    {#each presets as p}
                        <button
                                onclick={() => sessionTimeout = p.value}
                                class="text-xs px-2.5 py-1 rounded-md border transition-all
                                {sessionTimeout === p.value
                                    ? 'border-primary bg-primary/5 text-foreground font-medium'
                                    : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'}"
                        >
                            {p.label}
                        </button>
                    {/each}
                </div>

                <!-- Custom input -->
                <div class="flex items-center gap-2">
                    <Input
                            id="session-timeout"
                            type="number"
                            bind:value={sessionTimeout}
                            min={1}
                            max={720}
                            class="w-24 tabular-nums"
                    />
                    <span class="text-sm text-muted-foreground">hours</span>
                </div>

                <p class="text-xs text-muted-foreground">Users are logged out after this period of inactivity</p>
            </div>

            <div class="px-5 py-3.5 flex justify-end">
                <Button onclick={save} disabled={updateMutation.isPending} size="sm">
                    {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
            </div>
        {/if}
    </div>

    <div class="rounded-xl border bg-muted/30 px-5 py-4">
        <p class="text-xs text-muted-foreground leading-relaxed">
            Session timeout changes apply to new sessions only. Existing sessions remain valid until they expire or the user logs out.
        </p>
    </div>
</div>