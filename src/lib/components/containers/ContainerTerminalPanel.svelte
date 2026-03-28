<script lang="ts">
  import '@xterm/xterm/css/xterm.css';
  import { onDestroy } from 'svelte';
  import type { Terminal as TerminalType } from '@xterm/xterm';
  import type { FitAddon as FitAddonType } from '@xterm/addon-fit';
  import {tokenStore} from "$lib/api/client.js";

  type Props = {
    containerId: string;
    containerStatus: string;
  };

  let { containerId, containerStatus }: Props = $props();

  let terminalEl = $state<HTMLElement | null>(null);
  let term: TerminalType | null = null;
  let fitAddon: FitAddonType | null = null;
  let ws: WebSocket | null = null;

  let connected = $state(false);
  let connecting = $state(false);
  let exited = $state(false);
  let termCols = $state(80);
  let termRows = $state(24);
  let detectedShell = $state('bash → sh');
  let resizeObserver: ResizeObserver | null = null;

  const isRunning = $derived(containerStatus === 'running');

  $effect(() => {
    if (terminalEl && isRunning && !term) {
      initTerminal();
    }
  });

  onDestroy(() => {
    cleanup();
  });

  async function initTerminal() {
    if (!terminalEl || term) return;

    const { Terminal } = await import('@xterm/xterm');
    const { FitAddon } = await import('@xterm/addon-fit');
    const { WebLinksAddon } = await import('@xterm/addon-web-links');

    term = new Terminal({
      theme: {
        background: '#0d1117',
        foreground: '#c9d1d9',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc',
      },
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", "Menlo", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 5000,
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(terminalEl);
    fitAddon.fit();
    termCols = term.cols;
    termRows = term.rows;

    resizeObserver = new ResizeObserver(() => {
      fitAddon?.fit();
      if (term) {
        termCols = term.cols;
        termRows = term.rows;
        if (ws?.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      }
    });
    resizeObserver.observe(terminalEl);

    connectWebSocket();
  }

  function connectWebSocket() {
    if (!term) return;
    connecting = true;
    exited = false;

    const token = tokenStore.get();
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${proto}//${window.location.host}/api/v1/containers/${containerId}/exec${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    ws = new WebSocket(url);

    ws.onopen = () => {
      connected = true;
      connecting = false;
      if (term) {
        ws!.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output' && term) {
          term.write(msg.data);
        } else if (msg.type === 'shell') {
          // Shell-Name vom Backend — z.B. "/bin/bash", "/bin/sh", "redis-cli"
          const name = msg.data.split('/').pop() ?? msg.data;
          detectedShell = name;
        } else if (msg.type === 'exit') {
          connected = false;
          exited = true;
          term?.write('\r\n\x1b[33m[process exited]\x1b[0m\r\n');
        }
      } catch {}
    };

    ws.onclose = () => { connected = false; connecting = false; };
    ws.onerror = () => {
      connected = false;
      connecting = false;
      term?.write('\r\n\x1b[31m[connection error]\x1b[0m\r\n');
    };

    term.onData((data) => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });
  }

  function reconnect() {
    ws?.close();
    ws = null;
    term?.clear();
    exited = false;
    detectedShell = '…';
    connectWebSocket();
  }

  function cleanup() {
    resizeObserver?.disconnect();
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Erst explizite close-Message schicken damit Backend die Session beendet
      // (Vite Proxy leitet ws.close() nicht zuverlässig weiter)
      try { ws.send(JSON.stringify({ type: 'close' })); } catch {}
      try { ws.close(1000, 'tab closed'); } catch {}
    }
    ws = null;
    term?.dispose();
    term = null;
  }
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
        <span>⌘</span>
        <span>exec</span>
        {#if connecting}
          <span class="text-amber-400 flex items-center gap-1">
            <span class="size-1.5 rounded-full bg-amber-400 animate-pulse"
            ></span>
            connecting…
          </span>
        {:else if connected}
          <span class="text-green-400 flex items-center gap-1">
            <span class="size-1.5 rounded-full bg-green-500 animate-pulse"
            ></span>
            connected
          </span>
        {:else if exited}
          <span class="text-zinc-500">— exited</span>
        {:else}
          <span class="text-zinc-600">— disconnected</span>
        {/if}
      </div>
    </div>

    <div class="flex items-center gap-2">
      {#if exited || (!connected && !connecting)}
        <button
          onclick={reconnect}
          class="text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-0.5 rounded border border-zinc-700 hover:border-zinc-500 flex items-center gap-1"
        >
          ↺ Reconnect
        </button>
      {/if}
      <span class="text-zinc-600 text-xs font-mono">{detectedShell}</span>
    </div>
  </div>

  <!-- Terminal -->
  <div class="relative" style="height: 480px;">
    {#if !isRunning}
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="text-center space-y-2">
          <div class="text-zinc-500 text-sm">Container is not running</div>
          <div class="text-zinc-600 text-xs">
            Start the container to open a terminal
          </div>
        </div>
      </div>
    {:else}
      <div
        bind:this={terminalEl}
        class="w-full h-full p-2"
        style="background: #0d1117;"
      ></div>
    {/if}
  </div>

  <!-- Bottom bar -->
  <div
    class="flex items-center justify-between px-4 py-2 bg-[#161b22] border-t border-zinc-800"
  >
    <div class="flex items-center gap-3 text-xs text-zinc-500 font-mono">
      <span class={isRunning ? "text-green-500" : "text-zinc-600"}>
        ● {containerStatus}
      </span>
      <span class="text-zinc-700">|</span>
      <span>{detectedShell}</span>
    </div>
    <span class="text-xs text-zinc-600 font-mono">
      {#if connected}{termCols}×{termRows}{:else}—{/if}
    </span>
  </div>
</div>
