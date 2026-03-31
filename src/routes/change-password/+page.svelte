<script lang="ts">
import { KeyRoundIcon } from "@lucide/svelte";
import { toast } from "svelte-sonner";
import { goto } from "$app/navigation";
import { api } from "$lib/api";
import { Button } from "$lib/components/ui/button/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";
import { auth } from "$lib/stores/auth.svelte";

let currentPassword = $state("");
let newPassword = $state("");
let confirmPassword = $state("");
let loading = $state(false);

const passwordsMatch = $derived(newPassword === confirmPassword);
const newPasswordLong = $derived(newPassword.length >= 8);
const canSubmit = $derived(
	currentPassword.length > 0 && newPasswordLong && passwordsMatch && !loading
);

async function submit() {
	if (!canSubmit) return;
	loading = true;
	try {
		await api.post("/api/v1/auth/change-password", {
			current_password: currentPassword,
			new_password: newPassword,
		});
		await auth.refresh();
		toast.success("Password changed successfully");
		await goto("/dashboard");
	} catch (err) {
		toast.error((err as Error)?.message ?? "Failed to change password");
	} finally {
		loading = false;
	}
}
</script>

<div class="min-h-svh flex items-center justify-center p-6">
    <div class="w-full max-w-sm space-y-6">
        <div class="space-y-1.5 text-center">
            <div class="inline-flex items-center justify-center size-10 rounded-full bg-primary/10 mb-3">
                <KeyRoundIcon class="size-5 text-primary" />
            </div>
            <h1 class="text-xl font-semibold">Set a new password</h1>
            <p class="text-sm text-muted-foreground">
                Your account requires a password change before continuing.
            </p>
        </div>

        <div class="rounded-xl border bg-card divide-y">
            <div class="px-5 py-5 space-y-4">
                <div class="space-y-1.5">
                    <Label for="current-password">Current (temporary) password</Label>
                    <Input
                            id="current-password"
                            type="password"
                            bind:value={currentPassword}
                            placeholder="Enter temporary password"
                            autocomplete="current-password"
                    />
                </div>

                <div class="space-y-1.5">
                    <Label for="new-password">New password</Label>
                    <Input
                            id="new-password"
                            type="password"
                            bind:value={newPassword}
                            placeholder="At least 8 characters"
                            autocomplete="new-password"
                            class={newPassword.length > 0 && !newPasswordLong ? 'border-destructive' : ''}
                    />
                    {#if newPassword.length > 0 && !newPasswordLong}
                        <p class="text-xs text-destructive">Must be at least 8 characters</p>
                    {/if}
                </div>

                <div class="space-y-1.5">
                    <Label for="confirm-password">Confirm new password</Label>
                    <Input
                            id="confirm-password"
                            type="password"
                            bind:value={confirmPassword}
                            placeholder="Repeat new password"
                            autocomplete="new-password"
                            class={confirmPassword.length > 0 && !passwordsMatch ? 'border-destructive' : ''}
                    />
                    {#if confirmPassword.length > 0 && !passwordsMatch}
                        <p class="text-xs text-destructive">Passwords do not match</p>
                    {/if}
                </div>
            </div>

            <div class="px-5 py-3.5 flex justify-end">
                <Button onclick={submit} disabled={!canSubmit} class="w-full">
                    {loading ? 'Saving…' : 'Set new password'}
                </Button>
            </div>
        </div>
    </div>
</div>