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
            toast.success('Settings saved');
        },
        onError: () => toast.error('Failed to save settings'),
    }));

    const settings = $derived(settingsQuery.data ?? null);

    let instanceName     = $state('');
    let registrationMode = $state<'open' | 'invite' | 'disabled'>('disabled');

    $effect(() => {
        if (settings) {
            instanceName     = settings.instance_name     ?? '';
            registrationMode = settings.registration_mode ?? 'disabled';
        }
    });

    function save() {
        updateMutation.mutate({
            instance_name:     instanceName,
            registration_mode: registrationMode,
        });
    }

    const registrationOptions = [
        { value: 'open',     label: 'Open',     description: 'Anyone can register' },
        { value: 'invite',   label: 'Invite',   description: 'Invite-only' },
        { value: 'disabled', label: 'Disabled', description: 'No new signups' },
    ] as const;
</script>

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
        <div class="px-5 py-5 space-y-5">
            <div class="space-y-1.5">
                <Label for="instance-name">Instance Name</Label>
                <Input id="instance-name" bind:value={instanceName} placeholder="My Tidefly" />
                <p class="text-xs text-muted-foreground">Displayed in the UI and outgoing emails</p>
            </div>

            <!-- Instance URL is intentionally hidden here — configured via TUI at startup -->

            <div class="space-y-2">
                <Label>Registration Mode</Label>
                <div class="grid grid-cols-3 gap-2">
                    {#each registrationOptions as opt}
                        <button
                                onclick={() => registrationMode = opt.value}
                                class="rounded-lg border px-3 py-2.5 text-left transition-all
                                {registrationMode === opt.value
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'}"
                        >
                            <div class="text-sm font-medium">{opt.label}</div>
                            <div class="text-xs mt-0.5 opacity-60">{opt.description}</div>
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <div class="px-5 py-3.5 flex justify-end">
            <Button onclick={save} disabled={updateMutation.isPending} size="sm">
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
            </Button>
        </div>
    {/if}
</div>