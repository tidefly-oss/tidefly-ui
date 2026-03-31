<script lang="ts">
    import { page } from "$app/state";
    import { agentApi, type WorkerContainer, type WorkerNode } from "$lib/api/v1/agent";
    import { createQuery } from "@tanstack/svelte-query";
    import { ChevronDownIcon, ContainerIcon, TerminalIcon } from "@lucide/svelte";
    import { onDestroy, tick } from "svelte";

    const workerId = $derived(page.params.id ?? "");

    const workerQuery = createQuery(() => ({
        queryKey: ["workers"],
        queryFn: () => agentApi.listWorkers(),
        staleTime: 30_000,
    }));

    const worker = $derived(
        (workerQuery.data ?? []).find((w: WorkerNode) => w.id === workerId) ?? null
    );

    const containersQuery = createQuery(() => ({
        queryKey: ["worker-containers", workerId],
        queryFn: () => agentApi.listContainers(workerId),
        enabled: !!workerId,
        staleTime: 10_000,
        refetchInterval: 15_000,
    }));

    const containers = $derived(
        (containersQuery.data ?? []).filter(
            (ct) => ct.labels?.["tidefly.internal"] !== "true"
        )
    );

    let selectedContainer = $state<WorkerContainer | null>(null);
    type LogEntry = { stream: "stdout" | "stderr"; line: string };
    let logs = $state<LogEntry[]>([]);
    let logsEs: EventSource | null = null;
    let streaming = $state(false);
    let autoScroll = $state(true);
    let logsContainer = $state<HTMLElement | null>(null);

    function scrollToBottom() {
        if (logsContainer && autoScroll)
            logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    function startStream(container: WorkerContainer) {
        stopStream();
        selectedContainer = container;
        logs = [];
        const url = agentApi.workerLogsUrl(workerId, container.id) + "&tail=500&follow=true";
        logsEs = new EventSource(url);
        streaming = true;
        logsEs.addEventListener("log", async (e) => {
            try {
                const entry = JSON.parse(e.data);
                logs = [...logs, entry].slice(-2000);
                await tick();
                scrollToBottom();
            } catch { /* ignore */ }
        });
        logsEs.addEventListener("done", () => { streaming = false; });
        logsEs.onerror = () => { streaming = false; };
    }

    function stopStream() {
        logsEs?.close();
        logsEs = null;
        streaming = false;
    }

    function handleScroll() {
        if (!logsContainer) return;
        const { scrollTop, scrollHeight, clientHeight } = logsContainer;
        autoScroll = scrollHeight - scrollTop - clientHeight < 40;
    }

    function jumpToBottom() {
        if (logsContainer) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
            autoScroll = true;
        }
    }

    function logLineClass(line: string, stream: string): string {
        if (stream === "stderr") return "text-red-400";
        const l = line.toLowerCase();
        if (/\b(error|fatal|fail|exception)\b/.test(l)) return "text-red-400";
        if (/\b(warn|warning)\b/.test(l)) return "text-amber-400";
        if (/\b(info|notice)\b/.test(l)) return "text-sky-300";
        if (/\b(debug|trace)\b/.test(l)) return "text-zinc-500";
        if (/\b(success|ok|ready|started|running)\b/.test(l)) return "text-green-400";
        return "text-zinc-300";
    }

    function containerName(name: string) {
        return name.startsWith("/") ? name.slice(1) : name;
    }

    onDestroy(() => stopStream());
</script>

<div class="space-y-6">
    <!-- Header -->
    <div>
        <h1 class="text-2xl font-bold tracking-tight">Container Logs</h1>
        {#if worker}
            <p class="text-sm text-muted-foreground mt-0.5 font-mono">{worker.name}</p>
        {/if}
    </div>

    <div class="flex gap-6">
        <!-- Container sidebar -->
        <div class="w-52 shrink-0">
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="px-3 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b bg-muted/20">
                    Containers
                </div>
                {#if containersQuery.isPending}
                    <div class="p-3 space-y-2">
                        {#each Array(3) as _, i (i)}
                            <div class="h-9 bg-muted rounded-lg animate-pulse"></div>
                        {/each}
                    </div>
                {:else if containers.length === 0}
                    <div class="flex flex-col items-center justify-center gap-2 py-10 px-4 text-center">
                        <ContainerIcon class="size-7 text-muted-foreground/30" />
                        <p class="text-xs text-muted-foreground">No containers</p>
                    </div>
                {:else}
                    <div class="p-2 flex flex-col gap-1">
                        {#each containers as ct (ct.id)}
                            <button
                                    onclick={() => startStream(ct)}
                                    class="flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors w-full
                                    {selectedContainer?.id === ct.id
                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'}"
                            >
                                <span class="size-1.5 rounded-full shrink-0 {ct.state === 'running' ? 'bg-green-500' : 'bg-zinc-500'}"></span>
                                <span class="truncate font-mono text-xs">{containerName(ct.name)}</span>
                            </button>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Log output — same style as ContainerLogTab -->
        <div class="flex-1 min-w-0">
            {#if !selectedContainer}
                <div class="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-xl flex items-center justify-center py-24">
                    <div class="flex flex-col items-center gap-3 text-center">
                        <TerminalIcon class="size-8 text-zinc-700" />
                        <p class="text-sm text-zinc-500">Select a container to stream its logs</p>
                    </div>
                </div>
            {:else}
                <div class="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-xl">
                    <!-- Title bar -->
                    <div class="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-zinc-800">
                        <div class="flex items-center gap-3">
                            <div class="flex items-center gap-1.5">
                                <span class="size-3 rounded-full bg-[#ff5f57]"></span>
                                <span class="size-3 rounded-full bg-[#febc2e]"></span>
                                <span class="size-3 rounded-full bg-[#28c840]"></span>
                            </div>
                            <div class="flex items-center gap-1.5 text-zinc-400 text-xs font-mono">
                                <TerminalIcon class="size-3" />
                                <span>{containerName(selectedContainer.name)}</span>
                                {#if streaming}
                                    <span class="flex items-center gap-1 text-green-400">
                                        <span class="size-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        live
                                    </span>
                                {:else}
                                    <span class="text-zinc-600">— ended</span>
                                {/if}
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <span class="text-zinc-600 text-xs font-mono">{logs.length} lines</span>
                            <button
                                    onclick={() => { logs = []; }}
                                    class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
                            >clear</button>
                        </div>
                    </div>

                    <!-- Logs -->
                    <div
                            bind:this={logsContainer}
                            onscroll={handleScroll}
                            class="h-128 overflow-y-auto p-4 font-mono text-xs leading-5"
                            style="background: #0d1117;"
                    >
                        {#if logs.length === 0}
                            <div class="flex items-center gap-2 text-zinc-600 py-4">
                                <span class="animate-pulse">▊</span>
                                <span>Waiting for logs…</span>
                            </div>
                        {:else}
                            {#each logs as log, i (i)}
                                <div class="flex gap-3 group hover:bg-white/3 px-1 rounded -mx-1">
                                    <span class="text-zinc-700 select-none w-8 shrink-0 text-right group-hover:text-zinc-600">{i + 1}</span>
                                    <span class="shrink-0 {log.stream === 'stderr' ? 'text-red-600' : 'text-zinc-700'}">{log.stream === "stderr" ? "!" : "›"}</span>
                                    <span class="break-all {logLineClass(log.line, log.stream)}">{log.line}</span>
                                </div>
                            {/each}
                            {#if streaming}
                                <div class="flex gap-3 px-1">
                                    <span class="text-zinc-700 w-8 text-right select-none">{logs.length + 1}</span>
                                    <span class="text-zinc-700">›</span>
                                    <span class="text-zinc-500 animate-pulse">▊</span>
                                </div>
                            {/if}
                        {/if}
                    </div>

                    <!-- Footer -->
                    <div class="flex items-center justify-between px-4 py-2 bg-[#161b22] border-t border-zinc-800">
                        <div class="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                            <span class={selectedContainer.state === "running" ? "text-green-500" : "text-zinc-600"}>
                                ● {selectedContainer.state}
                            </span>
                            <span class="text-zinc-700">|</span>
                            <span>stdout + stderr</span>
                        </div>
                        {#if !autoScroll}
                            <button
                                    onclick={jumpToBottom}
                                    class="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors border border-primary/30 hover:border-primary/60 rounded px-2 py-0.5"
                            >
                                <ChevronDownIcon class="size-3" /> Jump to bottom
                            </button>
                        {:else}
                            <span class="text-xs text-zinc-600 font-mono">auto-scroll on</span>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>