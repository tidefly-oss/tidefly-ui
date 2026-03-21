<script lang="ts">
    import { authApi } from '$lib/api/v1/auth';
    import { Button } from "$lib/components/ui/button/index.js";
    import { Field, FieldGroup, FieldLabel, FieldSeparator, FieldDescription } from "$lib/components/ui/field/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { cn, type WithElementRef } from "$lib/utils.js";
    import type { HTMLFormAttributes } from "svelte/elements";
    import {goto} from "$app/navigation";

    let {
        ref = $bindable(null),
        class: className,
        ...restProps
    }: WithElementRef<HTMLFormAttributes> = $props();

    const id = $props.id();

    let email    = $state("");
    let password = $state("");
    let error    = $state("");
    let loading  = $state(false);

    async function handleSubmit() {
        error = "";
        loading = true;
        try {
            await authApi.login({ email, password });
            await goto('/dashboard');
        } catch (e) {
            console.error('Login error:', e);
            error = "Login fehlgeschlagen";
        } finally {
            loading = false;
        }
    }
</script>

<form
        class={cn("flex flex-col gap-6", className)}
        bind:this={ref}
        onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}
        {...restProps}
>
    <FieldGroup>
        <div class="flex flex-col items-center gap-1 text-center">
            <h1 class="text-2xl font-bold">Login to your account</h1>
            <p class="text-muted-foreground text-sm text-balance">
                Enter your email below to login to your account
            </p>
        </div>
        {#if error}
            <p class="text-destructive text-sm text-center">{error}</p>
        {/if}
        <Field>
            <FieldLabel for="email-{id}">Email</FieldLabel>
            <Input id="email-{id}" type="email" placeholder="m@example.com" required bind:value={email} />
        </Field>
        <Field>
            <FieldLabel for="password-{id}">Password</FieldLabel>
            <Input id="password-{id}" type="password" required bind:value={password} />
        </Field>
        <Field>
            <Button type="submit" disabled={loading} class="w-full">
                {loading ? 'Logging in…' : 'Login'}
            </Button>
        </Field>
    </FieldGroup>
</form>