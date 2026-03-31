<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { ApiError } from "$lib/api/client";
  import type { ContainerStatus } from "$lib/api/v1/types";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { projectsApi } from "$lib/api";
  import { projectKeys, projectQueries } from "$lib/queries/projects.js";
  import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
  import {
    ArrowLeftIcon, CheckIcon, CircleIcon, ContainerIcon,
    Loader, PencilIcon, Trash2Icon, XIcon,
  } from "@lucide/svelte";

  const COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
    "#eab308", "#22c55e", "#14b8a6", "#3b82f6", "#06b6d4",
    "#64748b", "#78716c",
  ];

  const qc = useQueryClient();
  const id = $derived(page.params.id ?? "");

  const projectQuery = createQuery(() => projectQueries.detail(id));
  const containersQuery = createQuery(() => projectQueries.containers(id));

  const project = $derived(projectQuery.data ?? null);
  const containers = $derived(containersQuery.data ?? []);
  const loading = $derived(projectQuery.isPending);
  const error = $derived(projectQuery.error?.message ?? null);

  let deleting    = $state(false);
  let editing     = $state(false);
  let showDelete  = $state(false);

  let editName        = $state("");
  let editDescription = $state("");
  let editColor       = $state("");
  let editError       = $state<string | null>(null);

  const updateMut = createMutation(() => ({
    mutationFn: (data: { name: string; description?: string; color: string }) =>
            projectsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
      qc.invalidateQueries({ queryKey: projectKeys.all() });
      editing = false;
    },
    onError: (e: unknown) => {
      editError = e instanceof ApiError ? e.message : "Failed to update project";
    },
  }));

  const deleteMut = createMutation(() => ({
    mutationFn: () => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectKeys.all() });
      goto("/dashboard/projects");
    },
    onError: (e: unknown) => {
      console.error(e);
      deleting = false;
      showDelete = false;
    },
  }));

  const saving = $derived(updateMut.isPending);

  function startEdit() {
    if (!project) return;
    editName        = project.name;
    editDescription = project.description;
    editColor       = project.color;
    editError       = null;
    editing         = true;
  }

  async function saveEdit() {
    if (!editName.trim()) { editError = "Name is required"; return; }
    editError = null;
    updateMut.mutate({
      name:        editName.trim(),
      description: editDescription.trim() || undefined,
      color:       editColor,
    });
  }

  async function confirmDelete() {
    deleting = true;
    deleteMut.mutate();
  }

  const statusDot: Record<ContainerStatus, string> = {
    running: "#22c55e",
    stopped: "#6b7280",
    exited:  "#6b7280",
    paused:  "#f59e0b",
    created: "#3b82f6",
  };

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("de-DE");
  }
</script>

<div class="space-y-4">
  <a
          href="/dashboard/projects"
          class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
  >
    <ArrowLeftIcon class="size-3.5" /> Projects
  </a>

  {#if loading}
    <div class="bg-card border rounded-xl p-6 animate-pulse space-y-3">
      <div class="h-5 bg-muted rounded w-48"></div>
      <div class="h-3 bg-muted rounded w-64"></div>
    </div>
  {:else if error}
    <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
      {error}
    </div>
  {:else if project}
    <!-- Header -->
    <div class="bg-card border rounded-xl px-5 py-4">
      {#if editing}
        <div class="space-y-3">
          {#if editError}
            <div class="text-xs text-destructive">{editError}</div>
          {/if}
          <div class="flex flex-wrap gap-1.5">
            {#each COLORS as c}
              <button
                      type="button"
                      onclick={() => (editColor = c)}
                      class="size-5 rounded-full transition-transform hover:scale-110 {editColor === c ? 'ring-2 ring-offset-1 ring-ring scale-110' : ''}"
                      style="background: {c}"
                      aria-label="Select color {c}"
              ></button>
            {/each}
          </div>
          <input
                  type="text"
                  bind:value={editName}
                  placeholder="Project name"
                  class="w-full px-3 py-1.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <textarea
                  bind:value={editDescription}
                  placeholder="Description (optional)"
                  rows="2"
                  class="w-full px-3 py-1.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          ></textarea>
          <div class="flex gap-2">
            <Button size="sm" onclick={saveEdit} disabled={saving}>
              {#if saving}<Loader class="size-3 mr-1 animate-spin" />{:else}<CheckIcon class="size-3 mr-1" />{/if}
              Save
            </Button>
            <Button size="sm" variant="outline" onclick={() => (editing = false)} disabled={saving}>
              <XIcon class="size-3 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      {:else}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="size-4 rounded-full shrink-0" style="background: {project.color}"></div>
            <div>
              <h1 class="font-semibold">{project.name}</h1>
              {#if project.description}
                <p class="text-xs text-muted-foreground mt-0.5">{project.description}</p>
              {/if}
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="sm" onclick={startEdit}>
              <PencilIcon class="size-3 mr-1.5" /> Edit
            </Button>
            <Button variant="destructive" size="sm" disabled={deleting} onclick={() => showDelete = true}>
              {#if deleting}
                <Loader class="size-3 mr-1.5 animate-spin" />
              {:else}
                <Trash2Icon class="size-3 mr-1.5" />
              {/if}
              Delete
            </Button>
          </div>
        </div>
      {/if}
    </div>

    <!-- Info + Containers -->
    <div class="grid gap-4 lg:grid-cols-3">
      <div class="bg-card border rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b text-sm font-medium">Details</div>
        <div class="divide-y">
          {#each [["Network", project.network_name], ["Created", formatDate(project.created_at)], ["Updated", formatDate(project.updated_at)]] as [label, value]}
            <div class="px-4 py-2.5 flex gap-3">
              <span class="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
              <span class="text-xs font-mono break-all">{value}</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="lg:col-span-2 bg-card border rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b flex items-center gap-2 text-sm font-medium">
          <ContainerIcon class="size-3.5" />
          Containers
          <Badge variant="secondary" class="text-xs px-1.5 py-0 h-4">{containers.length}</Badge>
        </div>
        <div class="divide-y">
          {#if containers.length === 0}
            <div class="px-4 py-8 text-center">
              <p class="text-sm text-muted-foreground">No containers in this project's network</p>
              <p class="text-xs text-muted-foreground mt-1">
                Connect containers to <span class="font-mono">{project.network_name}</span>
              </p>
            </div>
          {:else}
            {#each containers as c (c.id)}
              <div class="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                <CircleIcon class="size-2 fill-current shrink-0" style="color: {statusDot[c.status]}" />
                <div class="flex-1 min-w-0">
                  <span class="text-sm font-medium">{c.name}</span>
                  <div class="text-xs text-muted-foreground mt-0.5">{c.image}</div>
                </div>
                <a href="/dashboard/containers/{c.id}" class="text-xs text-muted-foreground hover:text-foreground">
                  View →
                </a>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={showDelete}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete project?</AlertDialog.Title>
      <AlertDialog.Description>
        This will permanently delete <span class="font-medium text-foreground">{project?.name}</span>
        and its Docker network <span class="font-mono text-foreground">{project?.network_name}</span>.
        Containers in this network will lose their project association. This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel disabled={deleting}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
              class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onclick={confirmDelete}
      >
        {#if deleting}
          <Loader class="size-3 mr-1.5 animate-spin" />
        {/if}
        Delete Project
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>