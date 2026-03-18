<script lang="ts">
  import { goto } from "$app/navigation";
  import { volumesApi } from "$lib/api/v1/volumes";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    FlexRender,
    createSvelteTable,
  } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { HardDriveIcon, SearchIcon, Trash2Icon } from "@lucide/svelte";
  import { auth } from "$lib/stores/auth.svelte";
  import {
    createMutation,
    createQuery,
    useQueryClient,
  } from "@tanstack/svelte-query";
  import {
    getCoreRowModel,
    getFilteredRowModel,
    type ColumnDef,
    type ColumnFiltersState,
  } from "@tanstack/table-core";
  import type {Volume} from "$lib/api/v1/types";

  let { initialData }: { initialData: Volume[] } = $props();

  const queryClient = useQueryClient();
  const isAdmin = $derived(auth.user?.role === 'admin');

  const query = createQuery(() => ({
    queryKey: ["volumes"],
    queryFn: () => volumesApi.list(),
    initialData,
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: (name: string) => volumesApi.delete(name),
    onSuccess: (_: unknown, name: string) => {
      queryClient.setQueryData<Volume[]>(
              ["volumes"],
              (old) => old?.filter((v) => v.name !== name) ?? [],
      );
    },
  }));

  let globalFilter = $state("");
  let columnFilters = $state<ColumnFiltersState>([]);
  let usedBy = $state<Record<string, { id: string; name: string }[]>>({});

  $effect(() => {
    (query.data ?? []).forEach((v) => {
      if (usedBy[v.name] === undefined) fetchContainers(v.name);
    });
  });

  async function fetchContainers(volumeName: string) {
    try {
      const res = await fetch(
              `/api/v1/volumes/${encodeURIComponent(volumeName)}/containers`,
      );
      usedBy[volumeName] = res.ok ? await res.json() : [];
    } catch {
      usedBy[volumeName] = [];
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const columns: ColumnDef<Volume>[] = [
    { accessorKey: "name", header: "Name" },
    { id: "usedBy", header: "Used by" },
    { accessorKey: "driver", header: "Driver" },
    { accessorKey: "mountpath", header: "Mountpath" },
    { accessorKey: "created_at", header: "Created" },
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
      globalFilter =
              typeof updater === "function" ? updater(globalFilter) : updater;
    },
    onColumnFiltersChange: (updater) => {
      columnFilters =
              typeof updater === "function" ? updater(columnFilters) : updater;
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
            placeholder="Search volumes..."
            bind:value={globalFilter}
            class="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
    />
  </div>

  <div class="bg-card border rounded-xl overflow-hidden">
    {#if query.isPending}
      {#each Array(3) as _, i (i)}
        <div class="px-4 py-3 border-b flex items-center gap-4 animate-pulse">
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 bg-muted rounded w-48"></div>
            <div class="h-3 bg-muted rounded w-64"></div>
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
            {@const v = row.original}
            {@const containers = usedBy[v.name] ?? []}
            <Table.Row class="border-b last:border-0 hover:bg-muted/30 group">
              <Table.Cell class="px-4 py-3 font-mono text-sm font-medium"
              >{v.name}</Table.Cell
              >

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
              >{v.driver}</Table.Cell
              >
              <Table.Cell
                      class="px-4 py-3 text-xs text-muted-foreground font-mono truncate max-w-48"
              >{v.mountpath}</Table.Cell
              >
              <Table.Cell
                      class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
              >{formatDate(v.created_at)}</Table.Cell
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
                                  disabled={deleteMutation.isPending && deleteMutation.variables === v.name}
                          >
                            <Trash2Icon class="size-3" />
                          </Button>
                        {/snippet}
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Header>
                          <AlertDialog.Title>Delete volume "{v.name}"?</AlertDialog.Title>
                          <AlertDialog.Description>
                            All data stored in this volume will be <span class="font-medium text-destructive">permanently lost</span>. This action cannot be undone.
                          </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                          <AlertDialog.Action
                                  class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onclick={() => deleteMutation.mutate(v.name)}
                          >
                            Delete Volume
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
                <HardDriveIcon
                        class="size-8 mx-auto mb-2 text-muted-foreground opacity-30"
                />
                <p class="text-sm text-muted-foreground">No volumes found</p>
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>