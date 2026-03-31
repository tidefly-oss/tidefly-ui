<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    deployApi
  } from "$lib/api/v1/deploy";
  import type { Service, ServiceStatus } from "$lib/api/v1/types";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    FlexRender,
    createSvelteTable,
  } from "$lib/components/ui/data-table/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import {
    CircleIcon,
    DatabaseIcon,
    PlusIcon,
    Trash2Icon,
  } from "@lucide/svelte";
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

  let { initialData }: { initialData: Service[] } = $props();

  const queryClient = useQueryClient();

  const query = createQuery(() => ({
    queryKey: ["services"],
    queryFn: () => deployApi.list(),
    initialData,
  }));

  const deleteMutation = createMutation(() => ({
    mutationFn: (id: string) => deployApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Service[]>(
        ["services"],
        (old) => old?.filter((s) => s.id !== id) ?? [],
      );
    },
  }));

  async function deleteService(id: string) {
    deleteMutation.mutate(id);
  }

  const statusColor: Record<ServiceStatus, string> = {
    running: "#22c55e",
    deploying: "#3b82f6",
    stopped: "#6b7280",
    failed: "#ef4444",
  };

  const statusLabel: Record<ServiceStatus, string> = {
    running: "Running",
    deploying: "Deploying…",
    stopped: "Stopped",
    failed: "Failed",
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  let columnFilters = $state<ColumnFiltersState>([]);

  const columns: ColumnDef<Service>[] = [
    { id: "icon", header: "" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "version", header: "Version" },
    { accessorKey: "created_at", header: "Created" },
    { id: "actions", header: "Actions" },
  ];

  const table = createSvelteTable({
    get data() {
      return query.data ?? [];
    },
    columns,
    state: {
      get columnFilters() {
        return columnFilters;
      },
    },
    onColumnFiltersChange: (updater) => {
      columnFilters =
        typeof updater === "function" ? updater(columnFilters) : updater;
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });
</script>

<div class="bg-card border rounded-xl overflow-hidden">
  {#if query.isPending}
    {#each Array(3) as _, i (i)}
      <div class="px-4 py-4 border-b flex items-center gap-4 animate-pulse">
        <div class="size-8 rounded-lg bg-muted shrink-0"></div>
        <div class="flex-1 space-y-1.5">
          <div class="h-3.5 bg-muted rounded w-32"></div>
          <div class="h-3 bg-muted rounded w-48"></div>
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
          {@const s = row.original}
          <Table.Row class="border-b last:border-0 hover:bg-muted/30 group">
            <!-- Icon -->
            <Table.Cell class="px-4 py-3 w-8">
              <div
                class="bg-muted rounded-lg p-1.5 flex items-center justify-center"
              >
                <DatabaseIcon class="size-3.5 text-muted-foreground" />
              </div>
            </Table.Cell>

            <!-- Name + status -->
            <Table.Cell class="px-4 py-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium truncate">{s.name}</span>
                <span class="text-xs text-muted-foreground"
                  >{s.template_slug}</span
                >
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                <CircleIcon
                  class="size-1.5 fill-current"
                  style="color: {statusColor[s.status]}"
                />
                <span class="text-xs" style="color: {statusColor[s.status]}"
                  >{statusLabel[s.status]}</span
                >
              </div>
            </Table.Cell>

            <!-- Version -->
            <Table.Cell
              class="px-4 py-3 text-xs text-muted-foreground font-mono"
            >
              {s.version}
            </Table.Cell>

            <!-- Created -->
            <Table.Cell
              class="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap"
            >
              {formatDate(s.created_at)}
            </Table.Cell>

            <!-- Actions -->
            <Table.Cell class="px-4 py-3">
              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  {#snippet child({ props })}
                    <Button
                      {...props}
                      variant="ghost"
                      size="icon"
                      class="size-7 text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending &&
                        deleteMutation.variables === s.id}
                    >
                      <Trash2Icon class="size-3" />
                    </Button>
                  {/snippet}
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Header>
                    <AlertDialog.Title>Delete "{s.name}"?</AlertDialog.Title>
                    <AlertDialog.Description>
                      This will stop and remove all containers associated with
                      this service.
                      <span class="font-medium text-destructive"
                        >Volume data will be permanently lost</span
                      >
                      unless you have an external backup. This action cannot be undone.
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action
                      class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onclick={() => deleteService(s.id)}
                    >
                      Delete Service
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </Table.Cell>
          </Table.Row>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="py-16 text-center">
              <DatabaseIcon
                class="size-10 mx-auto mb-3 text-muted-foreground/30"
              />
              <p class="text-sm font-medium">No services deployed</p>
              <p class="text-xs text-muted-foreground mt-1">
                Deploy a database or other service to get started
              </p>
              <Button
                size="sm"
                variant="outline"
                class="mt-3"
                onclick={() => goto("/dashboard/services/templates")}
              >
                <PlusIcon class="size-3.5 mr-1.5" /> Deploy your first service
              </Button>
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  {/if}
</div>
