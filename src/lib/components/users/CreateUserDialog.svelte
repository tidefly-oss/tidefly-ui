<script lang="ts">
    import { adminApi } from '$lib/api/v1/admin';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { ShieldIcon, UserIcon, EyeIcon, EyeOffIcon, ClipboardIcon } from '@lucide/svelte';
    import { createMutation, useQueryClient } from '@tanstack/svelte-query';
    import { toast } from 'svelte-sonner';
    import type { AdminUser, UserRole } from '$lib/api/v1/types';

    let { open = $bindable(false) }: { open?: boolean } = $props();

    const qc = useQueryClient();

    let createEmail  = $state('');
    let createName   = $state('');
    let createRole   = $state<UserRole>('member');
    let tempPassword = $state<string | null>(null);
    let showTemp     = $state(false);

    const createMut = createMutation(() => ({
        mutationFn: () => adminApi.createUser({ email: createEmail, name: createName, role: createRole }),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: ['admin-users'] });
            tempPassword = data.temp_password;
            createEmail  = '';
            createName   = '';
            createRole   = 'member';
            toast.success('User created');
        },
        onError: () => toast.error('Failed to create user'),
    }));

    function onClose() {
        open         = false;
        tempPassword = null;
        showTemp     = false;
    }

    async function copyTemp() {
        if (!tempPassword) return;
        await navigator.clipboard.writeText(tempPassword);
        toast.success('Copied to clipboard');
    }
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) onClose(); }}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>New User</Dialog.Title>
            <Dialog.Description>
                A temporary password will be generated. The user must change it on first login.
            </Dialog.Description>
        </Dialog.Header>

        {#if tempPassword}
            <div class="space-y-4 py-2">
                <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 space-y-1">
                    <p class="text-xs font-medium text-amber-500">Temporary password — share securely</p>
                    <p class="text-xs text-muted-foreground">The user must change this on first login.</p>
                </div>
                <div class="space-y-1.5">
                    <Label>Temporary Password</Label>
                    <div class="flex gap-2">
                        <div class="flex-1 relative">
                            <input
                                    type={showTemp ? 'text' : 'password'}
                                    value={tempPassword}
                                    readonly
                                    class="w-full pr-9 pl-3 py-2 text-sm font-mono bg-muted border rounded-lg focus:outline-none"
                            />
                            <button
                                    type="button"
                                    onclick={() => showTemp = !showTemp}
                                    class="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {#if showTemp}
                                    <EyeOffIcon class="size-3.5" />
                                {:else}
                                    <EyeIcon class="size-3.5" />
                                {/if}
                            </button>
                        </div>
                        <Button variant="outline" size="icon" onclick={copyTemp}>
                            <ClipboardIcon class="size-3.5" />
                        </Button>
                    </div>
                </div>
            </div>
            <Dialog.Footer>
                <Button onclick={onClose}>Done</Button>
            </Dialog.Footer>
        {:else}
            <div class="space-y-4 py-2">
                <div class="space-y-1.5">
                    <Label for="create-name">Full Name</Label>
                    <Input id="create-name" bind:value={createName} placeholder="Jane Doe" />
                </div>
                <div class="space-y-1.5">
                    <Label for="create-email">Email</Label>
                    <Input id="create-email" type="email" bind:value={createEmail} placeholder="jane@example.com" />
                </div>
                <div class="space-y-1.5">
                    <Label>Role</Label>
                    <div class="grid grid-cols-2 gap-2">
                        {#each (['member', 'admin'] as UserRole[]) as r}
                            <button
                                    onclick={() => createRole = r}
                                    class="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all
                                    {createRole === r ? 'border-primary bg-primary/5' : 'border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'}"
                            >
                                {#if r === 'admin'}
                                    <ShieldIcon class="size-3.5" />
                                {:else}
                                    <UserIcon class="size-3.5" />
                                {/if}
                                <span class="text-sm font-medium capitalize">{r}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            </div>
            <Dialog.Footer>
                <Button variant="outline" onclick={onClose}>Cancel</Button>
                <Button
                        onclick={() => createMut.mutate()}
                        disabled={!createEmail.trim() || !createName.trim() || createMut.isPending}
                >
                    {createMut.isPending ? 'Creating…' : 'Create User'}
                </Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>