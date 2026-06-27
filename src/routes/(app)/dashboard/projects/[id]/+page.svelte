<script lang="ts">
import { ArrowLeftIcon, Loader } from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { projectsApi } from "$lib/api";
import { ApiError } from "$lib/api/client";
import ProjectContainers from "$lib/components/projects/ProjectContainers.svelte";
import ProjectHeader from "$lib/components/projects/ProjectHeader.svelte";
import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
import { projectKeys, projectQueries } from "$lib/queries/projects.js";

const qc = useQueryClient();
const id = $derived(page.params.id ?? "");

const projectQuery = createQuery(() => projectQueries.detail(id));
const containersQuery = createQuery(() => projectQueries.containers(id));

const project = $derived(projectQuery.data ?? null);
const containers = $derived(containersQuery.data ?? []);
const loading = $derived(projectQuery.isPending);
const error = $derived(projectQuery.error?.message ?? null);

let deleting = $state(false);
let editing = $state(false);
let showDelete = $state(false);

let editName = $state("");
let editDescription = $state("");
let editColor = $state("");
let editError = $state<string | null>(null);

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
	editName = project.name;
	editDescription = project.description;
	editColor = project.color;
	editError = null;
	editing = true;
}

async function saveEdit() {
	if (!editName.trim()) {
		editError = "Name is required";
		return;
	}
	editError = null;
	updateMut.mutate({
		name: editName.trim(),
		description: editDescription.trim() || undefined,
		color: editColor,
	});
}

async function confirmDelete() {
	deleting = true;
	deleteMut.mutate();
}

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
    <ProjectHeader
            {project}
            {editing}
            {saving}
            {deleting}
            {editName}
            {editDescription}
            {editColor}
            {editError}
            onStartEdit={startEdit}
            onSaveEdit={saveEdit}
            onCancelEdit={() => (editing = false)}
            onDeleteClick={() => (showDelete = true)}
            onEditNameChange={(v) => (editName = v)}
            onEditDescriptionChange={(v) => (editDescription = v)}
            onEditColorChange={(v) => (editColor = v)}
    />

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

      <ProjectContainers {containers} networkName={project.network_name} />
    </div>
  {/if}
</div>

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