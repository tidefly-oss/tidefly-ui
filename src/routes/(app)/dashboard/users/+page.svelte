<script lang="ts">
import UsersList from "$lib/components/users/UsersList.svelte";
</script>

<div class="space-y-6">
    <div>
        <h1 class="text-xl font-semibold">Users</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Manage user accounts and access</p>
    </div>

    <UsersList />
</div>