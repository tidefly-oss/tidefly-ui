<script lang="ts">
import { ChevronDownIcon, TerminalIcon } from "@lucide/svelte";
import { onDestroy, tick } from "svelte";
import { containersApi } from "$lib/api/v1/containers";

type Props = {
	containerId: string;
	containerName: string;
	containerStatus: string;
};

let { containerId, containerName, containerStatus }: Props = $props();

type LogEntry = { stream: "stdout" | "stderr"; line: string; ts?: string };

let logs = $state<LogEntry[]>([]);
let logsEs: EventSource | null = null;
let streaming = $state(false);
let autoScroll = $state(true);
let logsContainer = $state<HTMLElement | null>(null);

function scrollToBottom() {
	if (logsContainer && autoScroll) logsContainer.scrollTop = logsContainer.scrollHeight;
}

function start() {
	stop();
	logs = [];
	logsEs = new EventSource(containersApi.logsUrl(containerId));
	streaming = true;
	logsEs.addEventListener("log", async (e) => {
		try {
			const entry = JSON.parse(e.data);
			logs = [...logs, entry].slice(-1000);
			await tick();
			scrollToBottom();
		} catch {}
	});
	logsEs.addEventListener("done", () => {
		streaming = false;
	});
	logsEs.onerror = () => {
		streaming = false;
	};
}

function stop() {
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

// Auto-start when mounted
$effect(() => {
	start();
	return () => stop();
});

onDestroy(() => stop());
</script>

<div
  class="rounded-xl overflow-hidden border border-zinc-800 bg-[#0d1117] shadow-xl"
>
  <!-- Title bar -->
  <div
    class="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-zinc-800"
  >
    <div class="flex items-center gap-3">
      <div class="flex items-center gap-1.5">
        <span class="size-3 rounded-full bg-[#ff5f57]"></span>
        <span class="size-3 rounded-full bg-[#febc2e]"></span>
        <span class="size-3 rounded-full bg-[#28c840]"></span>
      </div>
      <div class="flex items-center gap-1.5 text-zinc-400 text-xs font-mono">
        <TerminalIcon class="size-3" />
        <span>{containerName}</span>
        {#if streaming}
          <span class="flex items-center gap-1 text-green-400">
            <span class="size-1.5 rounded-full bg-green-500 animate-pulse"
            ></span> live
          </span>
        {:else}
          <span class="text-zinc-600">— ended</span>
        {/if}
      </div>
    </div>
    <div class="flex items-center gap-3">
      <span class="text-zinc-600 text-xs font-mono">{logs.length} lines</span>
      <button
        onclick={() => {
          logs = [];
        }}
        class="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500"
        >clear</button
      >
    </div>
  </div>

  <!-- Logs -->
  <div
    bind:this={logsContainer}
    onscroll={handleScroll}
    class="h-130 overflow-y-auto p-4 font-mono text-xs leading-5 scroll-smooth"
    style="background: #0d1117;"
  >
    {#if logs.length === 0}
      <div class="flex items-center gap-2 text-zinc-600 py-4">
        <span class="animate-pulse">▊</span><span>Waiting for logs…</span>
      </div>
    {:else}
      {#each logs as log, i (i)}
        <div class="flex gap-3 group hover:bg-white/3 px-1 rounded -mx-1">
          <span
            class="text-zinc-700 select-none w-8 shrink-0 text-right group-hover:text-zinc-600"
            >{i + 1}</span
          >
          <span
            class="shrink-0 {log.stream === 'stderr'
              ? 'text-red-600'
              : 'text-zinc-700'}">{log.stream === "stderr" ? "!" : "›"}</span
          >
          <span class="break-all {logLineClass(log.line, log.stream)}"
            >{log.line}</span
          >
        </div>
      {/each}
      {#if streaming}
        <div class="flex gap-3 px-1">
          <span class="text-zinc-700 w-8 text-right select-none"
            >{logs.length + 1}</span
          >
          <span class="text-zinc-700">›</span>
          <span class="text-zinc-500 animate-pulse">▊</span>
        </div>
      {/if}
    {/if}
  </div>

  <!-- Footer -->
  <div
    class="flex items-center justify-between px-4 py-2 bg-[#161b22] border-t border-zinc-800"
  >
    <div class="flex items-center gap-3 text-xs text-zinc-500 font-mono">
      <span
        class={containerStatus === "running"
          ? "text-green-500"
          : "text-zinc-600"}>● {containerStatus}</span
      >
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
