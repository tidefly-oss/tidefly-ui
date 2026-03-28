<script lang="ts">
    import { adminApi } from '$lib/api/v1/admin';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { EyeIcon, EyeOffIcon, ClipboardIcon } from '@lucide/svelte';
    import { createMutation } from '@tanstack/svelte-query';
    import { toast } from 'svelte-sonner';
    import type { AdminUser } from '$lib/api/v1/types';

    let { target = $bindable(null) }: { target?: AdminUser | null } = $props();

    let resetPassword = $state<string | null>(null);
    let showTemp      = $state(false);

    const resetMut = createMutation(() => ({
        mutationFn: (id: string) => adminApi.resetUserPassword(id),
        onSuccess: (data) => {
            resetPassword = data.temp_password;
            showTemp      = false;
            toast.success('Password reset');
        },
        onError: () => toast.error('Failed to reset password'),
    }));

    function onClose() {
        target        = null;
        resetPassword = null;
        showTemp      = false;
    }

    async function copyTemp() {
        if (!resetPassword) return;
        await navigator.clipboard.writeText(resetPassword);
        toast.success('Copied to clipboard');
    }
</script>

<Dialog.Root open={!!target} onOpenChange={(o) => { if (!o) onClose(); }}>
    <Dialog.Content class="sm:max-w-md">
        <Dialog.Header>
            <Dialog.Title>Reset Password</Dialog.Title>
            <Dialog.Description>
                {#if target}
                    Reset password for <span class="font-medium text-foreground">{target.name}</span> ({target.email}).
                {/if}
            </Dialog.Description>
        </Dialog.Header>

        {#if resetPassword}
            <div class="space-y-4 py-2">
                <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3 space-y-1">
                    <p class="text-xs font-medium text-amber-500">New temporary password</p>
                    <p class="text-xs text-muted-foreground">The user must change this on next login.</p>
                </div>
                <div class="space-y-1.5">
                    <Label>Temporary Password</Label>
                    <div class="flex gap-2">
                        <div class="flex-1 relative">
                            <input
                                    type={showTemp ? 'text' : 'password'}
                                    value={resetPassword}
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
            <div class="py-2">
                <p class="text-sm text-muted-foreground">
                    A new temporary password will be generated. The user's current password will be invalidated immediately.
                </p>
            </div>
            <Dialog.Footer>
                <Button variant="outline" onclick={onClose}>Cancel</Button>
                <Button
                        variant="destructive"
                        onclick={() => target && resetMut.mutate(target.id)}
                        disabled={resetMut.isPending}
                >
                    {resetMut.isPending ? 'Resetting…' : 'Reset Password'}
                </Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>