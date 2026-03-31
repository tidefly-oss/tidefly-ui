<script lang="ts">
import { NetworkIcon, SearchIcon, Trash2Icon } from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
} from "@tanstack/table-core";
import { goto } from "$app/navigation";
import { networksApi } from "$lib/api/v1/networks";
import type { Network } from "$lib/api/v1/types";
import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import { createSvelteTable, FlexRender } from "$lib/components/ui/data-table/index.js";
import * as Table from "$lib/components/ui/table/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";
import { auth } from "$lib/stores/auth.svelte";

let { initialData }: { initialData: Network[] } = $props();

const queryClient = useQueryClient();
const isAdmin = $derived(auth.user?.role === "admin");

const query = createQuery(() => ({
	queryKey: ["networks"],
	queryFn: () => networksApi.list(),
	initialData,
}));

const deleteMutation = createMutation(() => ({
	mutationFn: (id: string) => networksApi.delete(id),
	onSuccess: (_, id) => {
		queryClient.setQueryData<Network[]>(
			["networks"],
			(old) => old?.filter((n) => n.id !== id) ?? []
		);
	},
}));

let globalFilter = $state("");
let columnFilters = $state<ColumnFiltersState>([]);
let usedBy = $state<Record<string, { id: string; name: string }[]>>({});

$effect(() => {
	(query.data ?? []).forEach((n) => {
		if (usedBy[n.id] === undefined) fetchContainers(n.id);
	});
});

async function fetchContainers(networkId: string) {
	try {
		usedBy[networkId] = await networksApi.containers(networkId);
	} catch {
		usedBy[networkId] = [];
	}
}

const columns: ColumnDef<Network>[] = [
	{ accessorKey: "name", header: "Name" },
	{ id: "usedBy", header: "Used by" },
	{ accessorKey: "driver", header: "Driver" },
	{ accessorKey: "scope", header: "Scope" },
	{ id: "subnet", header: "Subnet" },
	{ id: "actions", header: "Actions" },
];

const table = createSvelteTable({
	get data() {
		return query.data ?? [];
	},
	columns,
	state: {
		get globalFilter() {
			return globalFilter;
		},
		get columnFilters() {
			return columnFilters;
		},
	},
	onGlobalFilterChange: (updater) => {
		globalFilter = typeof updater === "function" ? updater(globalFilter) : updater;
	},
	onColumnFiltersChange: (updater) => {
		columnFilters = typeof updater === "function" ? updater(columnFilters) : updater;
	},
	getCoreRowModel: getCoreRowModel(),
	getFilteredRowModel: getFilteredRowModel(),
	globalFilterFn: "includesString",
});
</script>

<div class="space-y-4">
  <div class="relative max-w-xs">
    <SearchIcon
            class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
    />
    <input
            type="text"
            placeholder="Search networks..."
            bind:value={globalFilter}
            class="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
    />
  </div>

  <div class="bg-card border rounded-xl overflow-hidden">
    {#if query.isPending}
      {#each Array(4) as _, i (i)}
        <div class="px-4 py-3 border-b flex items-center gap-4 animate-pulse">
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 bg-muted rounded w-40"></div>
            <div class="h-3 bg-muted rounded w-24"></div>
          </div>
        </div>
      {/each}
    {:else if query.isError}
      <div class="px-4 py-8 text-center text-sm text-destructive">
        {query.error.message}
      </div>
    {:else}
      <Table.Root>
        <Table.Header>
          {#each table.getHeaderGroups() as hg (hg.id)}
            <Table.Row class="border-b hover:bg-transparent">
              {#each hg.headers as header (header.id)}
                <Table.Head
                        class="text-xs font-medium text-muted-foreground h-9 px-4"
                >
                  {#if !header.isPlaceholder}
                    <FlexRender
                            content={header.column.columnDef.header}
                            context={header.getContext()}
                    />
                  {/if}
                </Table.Head>
              {/each}
            </Table.Row>
          {/each}
        </Table.Header>
        <Table.Body>
          {#each table.getRowModel().rows as row (row.id)}
            {@const n = row.original}
            {@const containers = usedBy[n.id] ?? []}
            <Table.Row class="border-b last:border-0 hover:bg-muted/30 group">
              <Table.Cell class="px-4 py-3">
                <span class="text-sm font-medium block">{n.name}</span>
                <span class="text-xs text-muted-foreground font-mono"
                >{n.id.slice(0, 12)}</span
                >
              </Table.Cell>

              <Table.Cell class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  {#if containers.length === 0}
                    <span class="text-xs text-muted-foreground/50">—</span>
                  {:else}
                    {#each containers as ct}
                      <button
                              onclick={() => goto(`/dashboard/containers/${ct.id}`)}
                              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                      >{ct.name}</button
                      >
                    {/each}
                  {/if}
                </div>
              </Table.Cell>

              <Table.Cell class="px-4 py-3 text-xs text-muted-foreground"
              >{n.driver}</Table.Cell
              >
              <Table.Cell class="px-4 py-3 text-xs text-muted-foreground"
              >{n.scope}</Table.Cell
              >
              <Table.Cell
                      class="px-4 py-3 text-xs text-muted-foreground font-mono"
              >{n.ipam?.[0]?.subnet ?? "—"}</Table.Cell
              >

              <Table.Cell class="px-4 py-3">
                {#if isAdmin}
                  {#if containers.length > 0}
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <Button variant="ghost" size="icon" class="size-7 text-muted-foreground cursor-not-allowed" disabled>
                          <Trash2Icon class="size-3" />
                        </Button>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        In use by: {containers.map((c) => c.name).join(", ")}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <AlertDialog.Root>
                      <AlertDialog.Trigger>
                        {#snippet child({ props })}
                          <Button
                                  {...props}
                                  variant="ghost"
                                  size="icon"
                                  class="size-7 text-destructive hover:text-destructive"
                                  disabled={deleteMutation.isPending && deleteMutation.variables === n.id}
                          >
                            <Trash2Icon class="size-3" />
                          </Button>
                        {/snippet}
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Header>
                          <AlertDialog.Title>Delete network "{n.name}"?</AlertDialog.Title>
                          <AlertDialog.Description>
                            This will permanently remove the network. Containers that depend on it may lose connectivity.
                          </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                          <AlertDialog.Action
                                  class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onclick={() => deleteMutation.mutate(n.id)}
                          >
                            Delete Network
                          </AlertDialog.Action>
                        </AlertDialog.Footer>
                      </AlertDialog.Content>
                    </AlertDialog.Root>
                  {/if}
                {/if}
              </Table.Cell>
            </Table.Row>
          {:else}
            <Table.Row>
              <Table.Cell colspan={columns.length} class="py-12 text-center">
                <NetworkIcon
                        class="size-8 mx-auto mb-2 text-muted-foreground opacity-30"
                />
                <p class="text-sm text-muted-foreground">No networks found</p>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>