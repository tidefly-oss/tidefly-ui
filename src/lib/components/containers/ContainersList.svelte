<script lang="ts">
  import {
    type Container,
    type ContainerStatus,
  } from "$lib/api/v1/types";
  import { containersApi } from "$lib/api/v1/containers/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    ActivityIcon,
    CalendarIcon,
    ChevronRightIcon,
    CircleIcon,
    DatabaseIcon,
    FileCodeIcon,
    FileImageIcon,
    FolderPenIcon,
    HardDriveIcon,
    LayersIcon,
    NetworkIcon,
    PlayIcon,
    RotateCcwIcon,
    SearchIcon,
    SquareIcon,
    Trash2Icon,
  } from "@lucide/svelte";
  import {
    createMutation,
    createQuery,
    useQueryClient,
  } from "@tanstack/svelte-query";
  import { auth } from "$lib/stores/auth.svelte";

  let { initialData }: { initialData: Container[] } = $props();

  const queryClient = useQueryClient();
  const isAdmin = $derived(auth.user?.role === 'admin');

  // Admins can always delete. Members can delete containers that belong to a project.
  // Backend enforces actual membership — this controls button visibility only.
  function canDelete(c: { labels?: Record<string, string> | null }): boolean {
    return isAdmin || !!c.labels?.["tidefly.project"] || !!c.labels?.["tidefly.service"];
  }

  const query = createQuery(() => ({
    queryKey: ["containers"],
    queryFn: () => containersApi.list(true),
    initialData,
    refetchInterval: 10_000,
  }));

  const actionMutation = createMutation(() => ({
    mutationFn: async ({
                         id,
                         action,
                       }: {
      id: string;
      action: "start" | "stop" | "restart" | "delete";
    }): Promise<{ status: ContainerStatus }> => {
      if (action === "start") return containersApi.start(id);
      if (action === "stop") return containersApi.stop(id);
      if (action === "restart") return containersApi.restart(id);
      await containersApi.delete(id, true);
      return { status: "exited" };
    },
    onSuccess: (_, { id, action }) => {
      if (action === "delete") {
        queryClient.setQueryData<Container[]>(
                ["containers"],
                (old) => old?.filter((c) => c.id !== id) ?? [],
        );
      } else {
        const statusMap: Record<string, ContainerStatus> = {
          start: "running",
          stop: "exited",
          restart: "running",
        };
        queryClient.setQueryData<Container[]>(
                ["containers"],
                (old) =>
                        old?.map((c) =>
                                c.id === id ? { ...c, status: statusMap[action] } : c,
                        ) ?? [],
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["containers"] });
    },
  }));

  type Filter = "all" | "running" | "stopped";
  let filter = $state<Filter>("all");
  let globalFilter = $state("");

  const statusDot: Record<ContainerStatus, string> = {
    running: "#22c55e",
    stopped: "#6b7280",
    exited: "#6b7280",
    paused: "#f59e0b",
    created: "#3b82f6",
  };

  const statusColor: Record<ContainerStatus, string> = {
    running: "text-green-500",
    stopped: "text-muted-foreground",
    exited: "text-muted-foreground",
    paused: "text-yellow-500",
    created: "text-blue-500",
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  function doAction(
          id: string,
          action: "start" | "stop" | "restart" | "delete",
  ) {
    actionMutation.mutate({ id, action });
  }

  function isPending(id: string) {
    return actionMutation.isPending && actionMutation.variables?.id === id;
  }

  const allContainers = $derived(query.data ?? []);

  const filteredData = $derived(
          allContainers.filter((c) => {
            const matchesFilter =
                    filter === "all" ||
                    (filter === "running" && c.status === "running") ||
                    (filter === "stopped" && c.status !== "running");
            const matchesSearch =
                    !globalFilter ||
                    c.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
                    c.image.toLowerCase().includes(globalFilter.toLowerCase());
            return matchesFilter && matchesSearch;
          }),
  );

  const runningCount = $derived(
          allContainers.filter((c) => c.status === "running").length,
  );
</script>

<div class="space-y-4">
  {#if query.isPending}
    <div class="bg-card border rounded-xl overflow-hidden">
      {#each Array(4) as _, i (i)}
        <div class="px-4 py-3 border-b flex items-center gap-4 animate-pulse">
          <div class="size-2 rounded-full bg-muted shrink-0"></div>
          <div class="flex-1 space-y-1.5">
            <div class="h-3.5 bg-muted rounded w-40"></div>
            <div class="h-3 bg-muted rounded w-56"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if allContainers.length === 0}
    <div class="bg-card border rounded-xl p-8 text-center space-y-6">
      <div>
        <div
                class="size-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3"
        >
          <LayersIcon class="size-6 text-muted-foreground" />
        </div>
        <h2 class="font-semibold">No containers yet</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Deploy a pre-configured service or bring your own Dockerfile / Compose
          file.
        </p>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 max-w-md mx-auto">
        <a href="/dashboard/services/templates" class="block">
          <div
                  class="bg-muted/50 border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-muted/80 transition-all h-full"
          >
            <div class="bg-blue-500/10 rounded-lg p-2 w-fit mb-3">
              <DatabaseIcon class="size-4 text-blue-500" />
            </div>
            <p class="text-sm font-medium">From Template</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              One-click deploy for Postgres, Redis, and more
            </p>
          </div>
        </a>
        <a href="/dashboard/containers/deploy" class="block">
          <div
                  class="bg-muted/50 border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-muted/80 transition-all h-full"
          >
            <div class="bg-primary/10 rounded-lg p-2 w-fit mb-3">
              <FileCodeIcon class="size-4 text-primary" />
            </div>
            <p class="text-sm font-medium">Custom Deploy</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              Bring your own Dockerfile or docker-compose.yml
            </p>
          </div>
        </a>
      </div>
    </div>
  {:else}
    <div class="flex items-center gap-3 flex-wrap">
      <div class="relative flex-1 min-w-48 max-w-xs">
        <SearchIcon
                class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground"
        />
        <input
                type="text"
                placeholder="Search containers..."
                bind:value={globalFilter}
                class="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
      <div class="flex rounded-lg border overflow-hidden shrink-0">
        {#each ["all", "running", "stopped"] as f (f)}
          <button
                  onclick={() => (filter = f as Filter)}
                  class="px-3 py-1.5 text-xs font-medium transition-colors {filter ===
            f
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-muted text-muted-foreground'}"
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {#if f === "running"}
              <span class="ml-1 text-green-500">{runningCount}</span>
            {:else if f === "all"}
              <span class="ml-1 opacity-60">{allContainers.length}</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <div class="bg-card border rounded-xl overflow-hidden">
      {#if query.isError}
        <div class="px-4 py-8 text-center text-sm text-destructive">
          {query.error.message}
        </div>
      {:else if filteredData.length === 0}
        <div class="px-4 py-10 text-center space-y-3">
          <p class="text-sm text-muted-foreground">
            No containers match your filter
          </p>
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <Button
                    size="sm"
                    variant="ghost"
                    onclick={() => {
                globalFilter = "";
                filter = "all";
              }}>Clear filter</Button
            >
            <span class="text-muted-foreground text-xs">or</span>
            <a href="/dashboard/containers/deploy">
              <Button size="sm" variant="outline">
                <FileCodeIcon class="size-3.5 mr-1.5" /> Deploy new container
              </Button>
            </a>
          </div>
        </div>
      {:else}
        <!-- Desktop: Name | Image | Volumes | Networks | Created | Actions -->
        <div class="hidden md:block">
          <div
                  class="grid grid-cols-[2rem_minmax(0,14rem)_10rem_minmax(0,1fr)_minmax(0,1fr)_7rem_9rem] px-4 py-2.5 border-b gap-6 items-center"
          >
            <div></div>
            <div
                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <FolderPenIcon class="size-3" /> Name
            </div>
            <div
                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <FileImageIcon class="size-3" /> Image
            </div>
            <div
                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <HardDriveIcon class="size-3" /> Volumes
            </div>
            <div
                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <NetworkIcon class="size-3" /> Networks
            </div>
            <div
                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <CalendarIcon class="size-3" /> Created
            </div>
            <div
                    class="text-xs font-medium text-muted-foreground flex items-center gap-1"
            >
              <ActivityIcon class="size-3" /> Actions
            </div>
          </div>

          {#each filteredData as c (c.id)}
            <div
                    class="grid grid-cols-[2rem_minmax(0,14rem)_10rem_minmax(0,1fr)_minmax(0,1fr)_7rem_9rem] px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors gap-6 items-center"
            >
              <div class="flex items-center justify-center">
                <CircleIcon
                        class="size-2 fill-current"
                        style="color: {statusDot[c.status]}"
                />
              </div>

              <!-- Name + ports -->
              <div class="min-w-0">
                <a
                        href="/dashboard/containers/{c.id}"
                        class="text-sm font-medium hover:underline block truncate"
                >
                  {c.name}
                </a>
                {#if (c.ports ?? []).length > 0}
                  <div class="flex gap-1 mt-0.5 flex-wrap">
                    {#each (c.ports ?? []).slice(0, 2) as p}
                      {#if p.host_port}
                        <span class="text-xs text-muted-foreground"
                        >{p.host_port}:{p.container_port}</span
                        >
                      {/if}
                    {/each}
                  </div>
                {:else}
                  <span class="text-xs capitalize {statusColor[c.status]}"
                  >{c.status}</span
                  >
                {/if}
              </div>

              <!-- Image -->
              <div>
                <Badge
                        variant="outline"
                        class="text-xs font-normal rounded-sm border-green-500/30 text-green-500 bg-green-500/10 max-w-full truncate"
                >
                  {c.image}
                </Badge>
              </div>

              <!-- Volumes -->
              <div class="flex flex-wrap gap-1 min-w-0">
                {#if c.mounts && c.mounts.length > 0}
                  {#each c.mounts.slice(0, 2) as m}
                    <a
                            href="/dashboard/volumes?q={encodeURIComponent(m.source)}"
                            onclick={(e) => e.stopPropagation()}
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors border border-amber-500/20 max-w-full truncate"
                    >
                      <HardDriveIcon class="size-2.5 shrink-0" />
                      <span class="truncate">{m.source}</span>
                    </a>
                  {/each}
                {:else}
                  <span class="text-xs text-muted-foreground/40">—</span>
                {/if}
              </div>

              <!-- Networks -->
              <div class="flex flex-wrap gap-1 min-w-0">
                {#if c.networks && c.networks.length > 0}
                  {#each c.networks
                          .filter((n: string) => !["bridge", "host", "none"].includes(n))
                          .slice(0, 2) as n}
                    <a
                            href="/dashboard/networks?q={encodeURIComponent(n)}"
                            onclick={(e) => e.stopPropagation()}
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20 max-w-full truncate"
                    >
                      <NetworkIcon class="size-2.5 shrink-0" />
                      <span class="truncate">{n}</span>
                    </a>
                  {/each}
                {:else}
                  <span class="text-xs text-muted-foreground/40">—</span>
                {/if}
              </div>

              <!-- Created -->
              <div>
                <span class="text-xs text-muted-foreground whitespace-nowrap"
                >{formatDate(c.created)}</span
                >
              </div>

              <!-- Actions -->
              <div class="flex items-center gap-0.5">
                {#if c.status === "running"}
                  <Button
                          variant="ghost"
                          size="icon"
                          class="size-7 cursor-pointer"
                          disabled={isPending(c.id)}
                          onclick={() => doAction(c.id, "stop")}
                  >
                    <SquareIcon class="size-3" />
                  </Button>
                  <Button
                          variant="ghost"
                          size="icon"
                          class="size-7 cursor-pointer"
                          disabled={isPending(c.id)}
                          onclick={() => doAction(c.id, "restart")}
                  >
                    <RotateCcwIcon class="size-3" />
                  </Button>
                {:else}
                  <Button
                          variant="ghost"
                          size="icon"
                          class="size-7 cursor-pointer"
                          disabled={isPending(c.id)}
                          onclick={() => doAction(c.id, "start")}
                  >
                    <PlayIcon class="size-3" />
                  </Button>
                  <span class="inline-block w-7"></span>
                {/if}

                {#if canDelete(c)}
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      {#snippet child({ props })}
                        <Button
                                {...props}
                                variant="ghost"
                                size="icon"
                                class="size-7 text-destructive hover:text-destructive cursor-pointer"
                                disabled={isPending(c.id)}
                        >
                          <Trash2Icon class="size-3" />
                        </Button>
                      {/snippet}
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Header>
                        <AlertDialog.Title>Delete "{c.name}"?</AlertDialog.Title>
                        <AlertDialog.Description>
                          This will permanently remove the container. Any data not stored in a volume will be lost.
                        </AlertDialog.Description>
                      </AlertDialog.Header>
                      <AlertDialog.Footer>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action
                                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onclick={() => doAction(c.id, "delete")}
                        >
                          Delete
                        </AlertDialog.Action>
                      </AlertDialog.Footer>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                {/if}

                <a
                        href="/dashboard/containers/{c.id}"
                        class="inline-flex items-center justify-center size-7"
                >
                  <ChevronRightIcon class="size-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          {/each}
        </div>

        <!-- Mobile -->
        <div class="md:hidden divide-y">
          {#each filteredData as c (c.id)}
            <div class="px-4 py-3 flex items-start gap-3">
              <CircleIcon
                      class="size-2 fill-current shrink-0 mt-1.5"
                      style="color: {statusDot[c.status]}"
              />
              <div class="flex-1 min-w-0 space-y-1">
                <a
                        href="/dashboard/containers/{c.id}"
                        class="text-sm font-medium hover:underline block truncate"
                >
                  {c.name}
                </a>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="text-xs text-muted-foreground truncate max-w-32"
                  >{c.image}</span
                  >
                  {#if c.mounts && c.mounts.length > 0}
                    <a
                            href="/dashboard/volumes?q={encodeURIComponent(
                        c.mounts[0].source,
                      )}"
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    >
                      <HardDriveIcon class="size-2.5" />{c.mounts[0].source}
                    </a>
                  {/if}
                  {#if c.networks && c.networks.filter((n: string) => !["bridge", "host", "none"].includes(n)).length > 0}
                    {@const net = c.networks.filter(
                            (n: string) => !["bridge", "host", "none"].includes(n),
                    )[0]}
                    <a
                            href="/dashboard/networks?q={encodeURIComponent(net)}"
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                      <NetworkIcon class="size-2.5" />{net}
                    </a>
                  {/if}
                </div>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                {#if c.status === "running"}
                  <Button
                          variant="ghost"
                          size="icon"
                          class="size-7"
                          disabled={isPending(c.id)}
                          onclick={() => doAction(c.id, "stop")}
                  >
                    <SquareIcon class="size-3" />
                  </Button>
                {:else}
                  <Button
                          variant="ghost"
                          size="icon"
                          class="size-7"
                          disabled={isPending(c.id)}
                          onclick={() => doAction(c.id, "start")}
                  >
                    <PlayIcon class="size-3" />
                  </Button>
                {/if}
                {#if canDelete(c)}
                  <AlertDialog.Root>
                    <AlertDialog.Trigger>
                      {#snippet child({ props })}
                        <Button
                                {...props}
                                variant="ghost"
                                size="icon"
                                class="size-7 text-destructive hover:text-destructive cursor-pointer"
                                disabled={isPending(c.id)}
                        >
                          <Trash2Icon class="size-3" />
                        </Button>
                      {/snippet}
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                      <AlertDialog.Header>
                        <AlertDialog.Title>Delete "{c.name}"?</AlertDialog.Title>
                        <AlertDialog.Description>
                          This will permanently remove the container. Any data not stored in a volume will be lost.
                        </AlertDialog.Description>
                      </AlertDialog.Header>
                      <AlertDialog.Footer>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action
                                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onclick={() => doAction(c.id, "delete")}
                        >
                          Delete
                        </AlertDialog.Action>
                      </AlertDialog.Footer>
                    </AlertDialog.Content>
                  </AlertDialog.Root>
                {/if}
                <a
                        href="/dashboard/containers/{c.id}"
                        class="inline-flex items-center justify-center size-7"
                >
                  <ChevronRightIcon class="size-4 text-muted-foreground" />
                </a>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>