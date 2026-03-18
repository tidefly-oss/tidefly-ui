<script lang="ts">
  import { goto } from "$app/navigation";
  import { type Image } from "$lib/api/v1/types/images.js";
  import { imagesApi } from "$lib/api/v1/images/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    FlexRender,
    createSvelteTable,
  } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import * as Tooltip from "$lib/components/ui/tooltip/index.js";
  import { SearchIcon, Trash2Icon } from "@lucide/svelte";
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

  let { initialData }: { initialData: Image[] } = $props();

  const queryClient = useQueryClient();
  const isAdmin = $derived(auth.user?.role === 'admin');

  const query = createQuery(() => ({
    queryKey: ["images"],
    queryFn: () => imagesApi.list(),
    initialData,
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
            imagesApi.delete(id, force),
    onSuccess: (_, { id }) => {
      queryClient.setQueryData<Image[]>(
              ["images"],
              (old) => old?.filter((i) => i.id !== id) ?? [],
      );
    },
  }));

  let globalFilter = $state("");
  let columnFilters = $state<ColumnFiltersState>([]);
  let usedBy = $state<Record<string, { id: string; name: string }[]>>({});

  $effect(() => {
    (query.data ?? []).forEach((img) => {
      if (usedBy[img.id] === undefined) fetchContainers(img.id);
    });
  });

  async function fetchContainers(imageId: string) {
    try {
      usedBy[imageId] = await imagesApi.containers(imageId);
    } catch {
      usedBy[imageId] = [];
    }
  }

  function formatSize(bytes: number) {
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
    return `${(bytes / 1e6).toFixed(0)} MB`;
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  const columns: ColumnDef<Image>[] = [
    { accessorKey: "tags", header: "Tag" },
    { id: "usedBy", header: "Used by" },
    { accessorKey: "size", header: "Size" },
    { accessorKey: "created", header: "Created" },
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
    globalFilterFn: (row, _, filterValue) =>
            row.original.tags.some((t: string) =>
                    t.toLowerCase().includes(filterValue.toLowerCase()),
            ),
  });
</script>

<div class="space-y-4">
  <div class="relative max-w-xs">
    <SearchIcon
            class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
    />
    <input
            type="text"
            placeholder="Search images..."
            bind:value={globalFilter}
            class="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
    />
  </div>

  <div class="bg-card border rounded-xl overflow-hidden">
    {#if query.isPending}
      {#each Array(4) as _, i (i)}
        <div class="px-4 py-3 border-b flex items-center gap-4 animate-pulse">
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 bg-muted rounded w-48"></div>
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
            {@const img = row.original}
            {@const containers = usedBy[img.id] ?? []}
            <Table.Row class="border-b last:border-0 hover:bg-muted/30 group">
              <!-- Tag -->
              <Table.Cell class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  {#if img.tags.length === 0}
                    <span class="text-xs text-muted-foreground font-mono"
                    >{img.id.slice(7, 19)}</span
                    >
                  {:else}
                    {#each img.tags as tag}
                      <Badge variant="secondary" class="text-xs font-normal"
                      >{tag}</Badge
                      >
                    {/each}
                  {/if}
                </div>
                <div class="text-xs text-muted-foreground mt-0.5 font-mono">
                  {img.id.slice(7, 19)}
                </div>
              </Table.Cell>

              <!-- Used by -->
              <Table.Cell class="px-4 py-3">
                <div class="flex flex-wrap gap-1">
                  {#if containers.length === 0}
                    <span class="text-xs text-muted-foreground/50">—</span>
                  {:else}
                    {#each containers as ct}
                      <button
                              onclick={() => goto(`/containers/${ct.id}`)}
                              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                      >{ct.name}</button
                      >
                    {/each}
                  {/if}
                </div>
              </Table.Cell>

              <!-- Size -->
              <Table.Cell
                      class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
              >
                {formatSize(img.size)}
              </Table.Cell>

              <!-- Created -->
              <Table.Cell
                      class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
              >
                {formatDate(img.created)}
              </Table.Cell>

              <!-- Actions -->
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
                                  disabled={deleteMutation.isPending && deleteMutation.variables?.id === img.id}
                          >
                            <Trash2Icon class="size-3" />
                          </Button>
                        {/snippet}
                      </AlertDialog.Trigger>
                      <AlertDialog.Content>
                        <AlertDialog.Header>
                          <AlertDialog.Title>Delete image?</AlertDialog.Title>
                          <AlertDialog.Description>
                            {#if img.tags.length > 0}
                              This will permanently delete <span class="font-medium text-foreground">{img.tags[0]}</span>.
                            {:else}
                              This will permanently delete image <span class="font-mono text-foreground">{img.id.slice(7, 19)}</span>.
                            {/if}
                            This action cannot be undone.
                          </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                          <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                          <AlertDialog.Action
                                  class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onclick={() => deleteMutation.mutate({ id: img.id, force: true })}
                          >
                            Delete
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
              <Table.Cell
                      colspan={columns.length}
                      class="py-12 text-center text-sm text-muted-foreground"
              >
                No images found
              </Table.Cell>
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    {/if}
  </div>
</div>