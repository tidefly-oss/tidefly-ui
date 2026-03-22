<script lang="ts">
    import { caddyLogsStore, type CaddyLogEntry } from '$lib/stores/caddy.logs.svelte.js';
    import { RefreshCwIcon, WifiIcon, WifiOffIcon } from '@lucide/svelte';
    import { onDestroy, onMount } from 'svelte';

    onMount(() => caddyLogsStore.connect(100));
    onDestroy(() => caddyLogsStore.disconnect());

    function statusBg(status: number) {
        if (!status) return 'bg-muted/50 text-muted-foreground';
        if (status >= 500) return 'bg-red-500/10 text-red-500';
        if (status >= 400) return 'bg-amber-500/10 text-amber-500';
        if (status >= 300) return 'bg-blue-500/10 text-blue-400';
        return 'bg-green-500/10 text-green-500';
    }

    function methodColor(method: string) {
        const map: Record<string, string> = {
            GET: 'text-blue-400', POST: 'text-green-500',
            PUT: 'text-amber-500', PATCH: 'text-amber-400', DELETE: 'text-red-500',
        };
        return map[method] ?? 'text-muted-foreground';
    }

    function levelColor(level: string) {
        if (level === 'error') return 'text-red-500';
        if (level === 'warn')  return 'text-amber-500';
        return 'text-muted-foreground';
    }

    function fmtDuration(d: number) {
        if (!d) return '';
        if (d < 0.001) return `${(d * 1000000).toFixed(0)}µs`;
        if (d < 1)     return `${(d * 1000).toFixed(1)}ms`;
        return `${d.toFixed(2)}s`;
    }

    function fmtSize(bytes: number) {
        if (!bytes) return '';
        if (bytes < 1024)        return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
    }

    function fmtTime(iso: string) {
        const d = new Date(iso);
        return isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('de-DE', {
            hour: '2-digit', minute: '2-digit', second: '2-digit',
        });
    }

    function isAccessLog(entry: CaddyLogEntry) {
        return !!entry.method;
    }
</script>

<div class="space-y-3">
    <div class="flex items-center gap-2">
        <div class="flex items-center gap-1.5 text-xs {caddyLogsStore.connected ? 'text-green-500' : 'text-muted-foreground'}">
            {#if caddyLogsStore.connected}
                <WifiIcon class="size-3.5" /> Live
            {:else}
                <WifiOffIcon class="size-3.5" /> Disconnected
            {/if}
        </div>
        <span class="text-xs text-muted-foreground ml-auto">{caddyLogsStore.entries.length} entries</span>
        <button onclick={() => caddyLogsStore.clear()}
                class="flex items-center gap-1.5 text-xs px-2 py-1.5 bg-muted/50 border rounded-lg hover:bg-muted transition-colors">
            <RefreshCwIcon class="size-3" /> Clear
        </button>
    </div>

    {#if caddyLogsStore.error}
        <div class="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-xs text-destructive">
            {caddyLogsStore.error}
        </div>
    {/if}

    <div class="bg-card border rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-xs">
                <thead>
                <tr class="border-b bg-muted/30">
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground w-24">Time</th>
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground w-16">Level</th>
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground w-16">Method</th>
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground">Logger / URI</th>
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground w-16">Status</th>
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground w-16">Size</th>
                    <th class="text-left px-4 py-2 font-medium text-muted-foreground w-20">Duration</th>
                </tr>
                </thead>
                <tbody class="divide-y font-mono">
                {#if caddyLogsStore.entries.length === 0}
                    <tr>
                        <td colspan="7" class="px-4 py-12 text-center text-muted-foreground">
                            {caddyLogsStore.connected ? 'Waiting for logs…' : 'Connecting…'}
                        </td>
                    </tr>
                {:else}
                    {#each caddyLogsStore.entries as entry, i (i)}
                        <tr class="hover:bg-muted/20 transition-colors {entry.level === 'error' ? 'bg-red-500/5' : ''}">
                            <td class="px-4 py-2 text-muted-foreground whitespace-nowrap">{fmtTime(entry.ts as unknown as string)}</td>
                            <td class="px-4 py-2 font-medium {levelColor(entry.level)}">{entry.level}</td>
                            <td class="px-4 py-2 font-bold {methodColor(entry.method ?? '')}">{entry.method ?? ''}</td>
                            <td class="px-4 py-2 max-w-xs">
                                {#if isAccessLog(entry)}
                                    <div class="truncate text-muted-foreground text-[10px]">{entry.host}</div>
                                    <div class="truncate">{entry.uri}</div>
                                {:else}
                                    <div class="truncate text-[10px] text-muted-foreground">{entry.logger}</div>
                                    <div class="truncate">{entry.msg}</div>
                                    {#if entry.error}
                                        <div class="truncate text-red-400 text-[10px]">{entry.error}</div>
                                    {/if}
                                {/if}
                            </td>
                            <td class="px-4 py-2">
                                {#if entry.status}
                                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold {statusBg(entry.status)}">{entry.status}</span>
                                {/if}
                            </td>
                            <td class="px-4 py-2 text-muted-foreground tabular-nums">{fmtSize(entry.size ?? 0)}</td>
                            <td class="px-4 py-2 text-muted-foreground tabular-nums">{fmtDuration(entry.duration ?? 0)}</td>
                        </tr>
                    {/each}
                {/if}
                </tbody>
            </table>
        </div>
    </div>
</div>