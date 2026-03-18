<script lang="ts">
    import { auth } from '$lib/stores/auth.svelte';
    import type { User } from '$lib/api/v1/types';
    import type { Snippet } from 'svelte';
    import { goto } from '$app/navigation';

    let { children, data }: { children: Snippet, data: { user: User } } = $props();

    auth.setUser(data.user);

    $effect(() => {
        if (auth.mustChangePassword) {
            goto('/change-password');
        }
    });
</script>

{@render children()}