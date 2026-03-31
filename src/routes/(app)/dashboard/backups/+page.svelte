<script lang="ts">
    import BackupS3Settings from "$lib/components/backup/BackupS3Settings.svelte";
    import BackupCreate from "$lib/components/backup/BackupCreate.svelte";
    import BackupList from "$lib/components/backup/BackupList.svelte";
</script>

<div class="space-y-6">
    <div>
        <h1 class="text-2xl font-bold tracking-tight">Backups</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Configure S3 storage and manage Postgres backups</p>
    </div>

    <BackupS3Settings />
    <BackupCreate />
    <BackupList />
</div>