<script lang="ts">
import { KeyIcon, PlusIcon, ShieldIcon } from "@lucide/svelte";
import { createQuery, useQueryClient } from "@tanstack/svelte-query";
import { agentApi } from "$lib/api/v1/agent/index.js";
import TokenDialog from "$lib/components/servers/TokenDialog.svelte";
import WorkerList from "$lib/components/servers/WorkerList.svelte";
import * as Alert from "$lib/components/ui/alert/index.js";
import { Button } from "$lib/components/ui/button/index.js";

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
const pendingTokens = $derived(
	(tokensQuery.data ?? []).filter((t) => !t.used && !isExpired(t.expires_at))
);

let tokenDialogOpen = $state(false);

function isExpired(dateStr: string) {
	return new Date(dateStr) < new Date();
}

function onWorkerRevoked() {
	qc.invalidateQueries({ queryKey: ["workers"] });
}

function onTokenCreated() {
	qc.invalidateQueries({ queryKey: ["agent-tokens"] });
}
</script>

<div class="space-y-6">
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

  {#if pendingTokens.length > 0}
    <Alert.Root class="border-amber-500/30 bg-amber-500/5">
      <KeyIcon class="size-4 text-amber-500" />
      <Alert.Title class="text-amber-500">Pending Registration Tokens</Alert.Title>
      <Alert.Description>
        {pendingTokens.length} token{pendingTokens.length > 1 ? "s" : ""} waiting to be used — expires after 24 hours.
      </Alert.Description>
    </Alert.Root>
  {/if}

  <WorkerList
          {workers}
          isLoading={workersQuery.isPending}
          onAddServer={() => (tokenDialogOpen = true)}
          {onWorkerRevoked}
  />

</div>

<TokenDialog
        bind:open={tokenDialogOpen}
        {onTokenCreated}
/>