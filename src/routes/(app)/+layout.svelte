<script lang="ts">
    import { auth } from '$lib/stores/auth.svelte';
    import type { Snippet } from 'svelte';
    import { goto } from '$app/navigation';
    import { onMount } from 'svelte';

    let { children }: { children: Snippet } = $props();
    let ready = $state(false);

    onMount(async () => {
        await auth.init();
        if (!auth.user) {
            await goto('/login');
            return;
        }
        ready = true;
    });

    $effect(() => {
        if (auth.mustChangePassword) {
            goto('/change-password');
        }
    });
</script>

{#if ready}
    {@render children()}
{/if}