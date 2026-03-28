<script lang="ts">
  import { agentApi, type WorkerNode } from "$lib/api/v1/agent/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as Dialog from "$lib/components/ui/dialog/index.js";
  import * as Alert from "$lib/components/ui/alert/index.js";
  import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
  import {
    CheckIcon,
    CircleIcon,
    ClipboardIcon,
    KeyIcon,
    Loader,
    PlusIcon,
    ServerIcon,
    ShieldIcon,
    Trash2Icon,
    TriangleAlertIcon,
  } from "@lucide/svelte";

  const qc = useQueryClient();

  const workersQuery = createQuery(() => ({
    queryKey: ["workers"],
    queryFn: () => agentApi.listWorkers(),
    refetchInterval: 10_000,
  }));

  const tokensQuery = createQuery(() => ({
    queryKey: ["agent-tokens"],
    queryFn: () => agentApi.listTokens(),
  }));

  const workers = $derived(workersQuery.data ?? []);
  const tokens = $derived((tokensQuery.data ?? []).filter((t) => !t.used));

  // ── Create token ──────────────────────────────────────────────────────────
  let tokenDialogOpen = $state(false);
  let tokenLabel = $state("");
  let createdToken = $state<string | null>(null);
  let copied = $state(false);

  const createTokenMutation = createMutation(() => ({
    mutationFn: () => agentApi.createToken({ label: tokenLabel }),
    onSuccess: (data) => {
      createdToken = data.token;
      tokenLabel = "";
      qc.invalidateQueries({ queryKey: ["agent-tokens"] });
    },
  }));

  function copyToken() {
    if (!createdToken) return;
    navigator.clipboard.writeText(createdToken);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  function closeTokenDialog() {
    tokenDialogOpen = false;
    createdToken = null;
    tokenLabel = "";
  }

  // ── Revoke worker ─────────────────────────────────────────────────────────
  let revokeTarget = $state<WorkerNode | null>(null);

  const revokeMutation = createMutation(() => ({
    mutationFn: (id: string) => agentApi.revokeWorker(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workers"] });
      revokeTarget = null;
    },
  }));

  // ── Helpers ───────────────────────────────────────────────────────────────
  function statusColor(status: WorkerNode["status"]) {
    const colors = {
      connected: "#22c55e",
      pending: "#f59e0b",
      disconnected: "#6b7280",
      revoked: "#ef4444",
    };
    return colors[status] ?? "#6b7280";
  }

  function statusLabel(status: WorkerNode["status"]) {
    return { connected: "Connected", pending: "Pending", disconnected: "Offline", revoked: "Revoked" }[status] ?? status;
  }

  function timeAgo(dateStr: string | null) {
    if (!dateStr) return "never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  function isExpired(dateStr: string) {
    return new Date(dateStr) < new Date();
  }

  const installCmd = $derived(
    createdToken
      ? `curl -fsSL https://raw.githubusercontent.com/tidefly-oss/tidefly-agent/main/scripts/install.sh | sudo PLANE_TOKEN=${createdToken} PLANE_ENDPOINT=YOUR_PLANE_HOST:7443 sh`
      : ""
  );
  let cmdCopied = $state(false);
  function copyCmd() {
    navigator.clipboard.writeText(installCmd);
    cmdCopied = true;
    setTimeout(() => (cmdCopied = false), 2000);
  }
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Servers</h1>
      <p class="text-sm text-muted-foreground mt-0.5">
        Manage worker nodes connected to this Plane
      </p>
    </div>
    <Button onclick={() => (tokenDialogOpen = true)}>
      <PlusIcon class="size-4 mr-2" />
      Add Server
    </Button>
  </div>

  <!-- Pending tokens -->
  {#if tokens.length > 0}
    <Alert.Root class="border-amber-500/30 bg-amber-500/5">
      <KeyIcon class="size-4 text-amber-500" />
      <Alert.Title class="text-amber-500">Pending Registration Tokens</Alert.Title>
      <Alert.Description>
        {tokens.length} token{tokens.length > 1 ? "s" : ""} waiting to be used.
        Tokens expire after 24 hours.
      </Alert.Description>
    </Alert.Root>
  {/if}

  <!-- Workers list -->
  <div class="bg-card border rounded-xl overflow-hidden">
    <div class="flex items-center justify-between px-5 py-4 border-b">
      <div class="flex items-center gap-2">
        <h2 class="font-medium text-sm">Worker Nodes</h2>
        {#if !workersQuery.isPending}
          <span class="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
            {workers.filter(w => w.status === "connected").length}/{workers.length} online
          </span>
        {/if}
      </div>
    </div>

    <div class="divide-y">
      {#if workersQuery.isPending}
        {#each Array(2) as _, i (i)}
          <div class="px-5 py-5 flex items-center gap-4 animate-pulse">
            <div class="size-9 rounded-lg bg-muted shrink-0"></div>
            <div class="flex-1 space-y-2">
              <div class="h-4 bg-muted rounded w-32"></div>
              <div class="h-3 bg-muted rounded w-48"></div>
            </div>
          </div>
        {/each}
      {:else if workers.length === 0}
        <div class="px-5 py-16 flex flex-col items-center gap-4 text-center">
          <div class="bg-muted rounded-full p-4">
            <ServerIcon class="size-8 text-muted-foreground" />
          </div>
          <div>
            <p class="font-medium">No servers connected</p>
            <p class="text-sm text-muted-foreground mt-1">
              Add a server to deploy containers across multiple machines
            </p>
          </div>
          <Button onclick={() => (tokenDialogOpen = true)}>
            <PlusIcon class="size-4 mr-2" /> Add Server
          </Button>
        </div>
      {:else}
        {#each workers as worker (worker.id)}
          <div class="px-5 py-4 flex items-center gap-4 group hover:bg-muted/20 transition-colors">
            <!-- Icon -->
            <div class="bg-muted rounded-lg p-2 shrink-0">
              <ServerIcon class="size-5 text-muted-foreground" />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm">{worker.name}</span>
                <CircleIcon
                  class="size-2 fill-current shrink-0"
                  style="color: {statusColor(worker.status)}"
                />
                <span class="text-xs" style="color: {statusColor(worker.status)}">
                  {statusLabel(worker.status)}
                </span>
              </div>
              <div class="flex items-center gap-3 mt-1 flex-wrap">
                {#if worker.last_seen_ip}
                  <span class="text-xs text-muted-foreground font-mono">{worker.last_seen_ip}</span>
                {/if}
                {#if worker.os}
                  <span class="text-xs text-muted-foreground">{worker.os}/{worker.arch}</span>
                {/if}
                {#if worker.runtime_type}
                  <span class="text-xs text-muted-foreground capitalize">{worker.runtime_type}</span>
                {/if}
                {#if worker.agent_version}
                  <span class="text-xs text-muted-foreground font-mono">v{worker.agent_version}</span>
                {/if}
                <span class="text-xs text-muted-foreground">
                  Last seen {timeAgo(worker.last_seen_at)}
                </span>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {#if worker.status !== "revoked"}
                <Button
                  variant="ghost"
                  size="icon"
                  class="size-8 text-destructive hover:text-destructive"
                  onclick={() => (revokeTarget = worker)}
                >
                  <Trash2Icon class="size-4" />
                </Button>
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- mTLS Info -->
  <div class="bg-card border rounded-xl p-5 flex items-start gap-4">
    <div class="bg-primary/10 rounded-lg p-2 shrink-0">
      <ShieldIcon class="size-5 text-primary" />
    </div>
    <div>
      <p class="text-sm font-medium">Secured with mTLS</p>
      <p class="text-xs text-muted-foreground mt-1">
        All communication between the Plane and Worker Agents is encrypted using mutual TLS.
        Certificates are issued by the Tidefly internal CA and automatically renewed before expiry.
      </p>
    </div>
  </div>
</div>

<!-- ── Add Server Dialog ─────────────────────────────────────────────────── -->
<Dialog.Root open={tokenDialogOpen} onOpenChange={(v) => { if (!v) closeTokenDialog(); }}>
  <Dialog.Content class="max-w-lg">
    <Dialog.Header>
      <Dialog.Title>Add Server</Dialog.Title>
      <Dialog.Description>
        Generate a one-time registration token and run the install script on your server.
      </Dialog.Description>
    </Dialog.Header>

    {#if !createdToken}
      <!-- Step 1: Generate token -->
      <div class="space-y-4 py-2">
        <div class="space-y-1.5">
          <label class="text-sm font-medium" for="token-label">Label <span class="text-muted-foreground font-normal">(optional)</span></label>
          <input
            id="token-label"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="e.g. hetzner-fsn1-01"
            bind:value={tokenLabel}
          />
        </div>
      </div>

      <Dialog.Footer>
        <Button variant="outline" onclick={closeTokenDialog}>Cancel</Button>
        <Button
          onclick={() => createTokenMutation.mutate()}
          disabled={createTokenMutation.isPending}
        >
          {#if createTokenMutation.isPending}
            <Loader class="size-4 mr-2 animate-spin" />
          {:else}
            <KeyIcon class="size-4 mr-2" />
          {/if}
          Generate Token
        </Button>
      </Dialog.Footer>
    {:else}
      <!-- Step 2: Show token + install command -->
      <div class="space-y-4 py-2">
        <Alert.Root class="border-green-500/30 bg-green-500/5">
          <CheckIcon class="size-4 text-green-500" />
          <Alert.Title class="text-green-500">Token Generated</Alert.Title>
          <Alert.Description>
            This token is valid for 24 hours and can only be used once.
          </Alert.Description>
        </Alert.Root>

        <!-- Token -->
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Registration Token</span>
          <div class="flex items-center gap-2">
            <code class="flex-1 text-xs bg-muted rounded-md px-3 py-2 font-mono break-all">{createdToken}</code>
            <Button variant="outline" size="icon" class="shrink-0" onclick={copyToken}>
              {#if copied}
                <CheckIcon class="size-4 text-green-500" />
              {:else}
                <ClipboardIcon class="size-4" />
              {/if}
            </Button>
          </div>
        </div>

        <!-- Install command -->
        <div class="space-y-1.5">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Install Command</span>
          <p class="text-xs text-muted-foreground">Run this on your server (replace <code class="bg-muted px-1 rounded">YOUR_PLANE_HOST</code> with your Plane's hostname):</p>
          <div class="flex items-start gap-2">
            <code class="flex-1 text-xs bg-muted rounded-md px-3 py-2 font-mono break-all leading-relaxed">{installCmd}</code>
            <Button variant="outline" size="icon" class="shrink-0 mt-0" onclick={copyCmd}>
              {#if cmdCopied}
                <CheckIcon class="size-4 text-green-500" />
              {:else}
                <ClipboardIcon class="size-4" />
              {/if}
            </Button>
          </div>
        </div>

        <p class="text-xs text-muted-foreground">
          After registration the server will appear in the list above automatically.
        </p>
      </div>

      <Dialog.Footer>
        <Button onclick={closeTokenDialog}>Done</Button>
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<!-- ── Revoke Confirm Dialog ─────────────────────────────────────────────── -->
<Dialog.Root open={!!revokeTarget} onOpenChange={(v) => { if (!v) revokeTarget = null; }}>
  <Dialog.Content class="max-w-sm">
    <Dialog.Header>
      <Dialog.Title>Revoke Server</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to revoke <strong>{revokeTarget?.name}</strong>?
        The agent will be disconnected and its certificate invalidated.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="outline" onclick={() => (revokeTarget = null)}>Cancel</Button>
      <Button
        variant="destructive"
        disabled={revokeMutation.isPending}
        onclick={() => revokeTarget && revokeMutation.mutate(revokeTarget.id)}
      >
        {#if revokeMutation.isPending}
          <Loader class="size-4 mr-2 animate-spin" />
        {/if}
        Revoke
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>