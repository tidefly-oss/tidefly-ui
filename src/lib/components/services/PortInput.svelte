<script lang="ts">
    import {createQuery} from '@tanstack/svelte-query';
    import {systemApi} from '$lib/api/v1/system';
    import {CircleCheck, RefreshCwIcon, TriangleAlertIcon} from '@lucide/svelte';
    import type {UsedPortEntry} from "$lib/api/v1/types";

    interface Props {
        value: number;
        onchange: (v: number) => void;
        label?: string;
        required?: boolean;
        ignorePorts?: number[];
    }

    let {
        value = $bindable(),
        onchange,
        label = 'Host Port',
        required = false,
        ignorePorts = [],
    }: Props = $props();

    const portsQuery = createQuery(() => ({
        queryKey: ['system-ports'],
        queryFn: () => systemApi.usedPorts(),
        staleTime: 10_000,
        refetchInterval: 30_000,
    }));

    const usedMap = $derived(
        new Map<number, UsedPortEntry>(
            (portsQuery.data?.ports ?? [])
                .filter(p => !ignorePorts.includes(p.port))
                .map(p => [p.port, p]),
        ),
    );

    const conflict = $derived(value > 0 ? usedMap.get(value) : undefined);

    const isLocalhostOnly = $derived(
        conflict?.host_ip === '127.0.0.1' || conflict?.host_ip === '::1'
    );

    function suggestPort(): number {
        let candidate = value + 1;
        while (usedMap.has(candidate) && candidate < 65535) {
            candidate++;
        }
        return candidate;
    }

    function handleInput(e: Event) {
        const v = parseInt((e.target as HTMLInputElement).value, 10);
        if (!isNaN(v) && v > 0 && v <= 65535) {
            onchange(v);
        }
    }
</script>

<div class="space-y-1.5">
    <label for="port-input" class="text-sm font-medium">
        {label}
        {#if required}<span class="text-destructive ml-0.5">*</span>{/if}
    </label>

    <div class="relative">
        <input
                id="port-input"
                type="number"
                {value}
                min="1"
                max="65535"
                oninput={handleInput}
                class="w-full rounded-md border bg-background px-3 py-2 pr-9 text-sm
                   ring-offset-background placeholder:text-muted-foreground
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                   [&::-webkit-inner-spin-button]:appearance-none
                   [&::-webkit-outer-spin-button]:appearance-none
                   {conflict ? 'border-amber-500 focus-visible:ring-amber-500' : 'border-input'}"
        />

        <div class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
            {#if portsQuery.isPending}
                <RefreshCwIcon class="size-3.5 text-muted-foreground animate-spin" />
            {:else if conflict}
                <TriangleAlertIcon class="size-3.5 text-amber-500" />
            {:else if value > 0}
                <CircleCheck class="size-3.5 text-green-500" />
            {/if}
        </div>
    </div>

    {#if conflict}
        <div class="flex items-start gap-2 rounded-md bg-amber-500/10 border border-amber-500/20 px-3 py-2">
            <TriangleAlertIcon class="size-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div class="text-xs text-amber-400 flex-1">
                Port {conflict.port} is allocated by
                <span class="font-medium text-amber-300">{conflict.container_name}</span>
                {#if isLocalhostOnly}
                    <span class="text-amber-500/70">(localhost-only, but still blocks the port)</span>
                {/if}
                —
                <button
                        type="button"
                        class="underline hover:no-underline font-medium"
                        onclick={() => onchange(suggestPort())}
                >
                    Use {suggestPort()} instead
                </button>
            </div>
        </div>
    {/if}
</div>