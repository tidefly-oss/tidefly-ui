<script lang="ts">
    import { systemApi } from '$lib/api/v1/system';
    import { ExternalLinkIcon } from '@lucide/svelte';
    import { createQuery } from '@tanstack/svelte-query';

    const systemQuery = createQuery(() => ({
        queryKey: ['system-info'],
        queryFn: () => systemApi.info(),
    }));

    const info = $derived(systemQuery.data ?? null);

    const rows = $derived([
        { label: 'Tidefly Version', value: info?.tidefly_version ?? '—' },
        { label: 'Runtime',         value: info?.runtime_type    ?? '—' },
        { label: 'Runtime Version', value: info?.version         ?? '—' },
        { label: 'API Version',     value: info?.api_version     ?? '—' },
        { label: 'OS',              value: info?.os              ?? '—' },
        { label: 'Architecture',    value: info?.architecture    ?? '—' },
        { label: 'Memory',          value: info ? `${info.mem_used_mb} MB / ${info.mem_total_mb} MB` : '—' },
        { label: 'Containers',      value: info ? `${info.running_count} running / ${info.container_count} total` : '—' },
    ]);
</script>

<div class="rounded-xl border bg-card divide-y">
    <div class="px-5 py-4">
        <h2 class="text-sm font-semibold">About</h2>
        <p class="text-xs text-muted-foreground mt-0.5">Version and system information</p>
    </div>

    <div class="divide-y">
        {#if systemQuery.isPending}
            {#each Array(6) as _, i (i)}
                <div class="px-5 py-3 flex items-center justify-between animate-pulse">
                    <div class="h-3 bg-muted rounded w-32"></div>
                    <div class="h-3 bg-muted rounded w-20"></div>
                </div>
            {/each}
        {:else}
            {#each rows as row}
                <div class="px-5 py-3 flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">{row.label}</span>
                    <span class="text-sm font-medium tabular-nums">{row.value}</span>
                </div>
            {/each}
        {/if}
    </div>

    <div class="px-5 py-3.5 flex gap-4">
        <a
                href="https://github.com/codify-studios/tidefly"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
            <ExternalLinkIcon class="size-3.5" />
            GitHub
        </a>
        <a
                href="https://github.com/codify-studios/tidefly/releases"
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
            <ExternalLinkIcon class="size-3.5" />
            Changelog
        </a>
    </div>
</div>