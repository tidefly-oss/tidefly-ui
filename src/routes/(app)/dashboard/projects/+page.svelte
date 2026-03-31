<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { projectQueries, projectKeys } from "$lib/queries/projects.js";
  import { projectsApi } from "$lib/api";
  import { createQuery, createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { ChevronRightIcon, NetworkIcon, PlusIcon, Trash2Icon } from "@lucide/svelte";

  const qc = useQueryClient();

  const projectsQuery = createQuery(() => projectQueries.list());
  const projects = $derived(projectsQuery.data ?? []);

  const deleteMutation = createMutation(() => ({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all() }),
  }));

  async function deleteProject(id: string, name: string) {
    if (!confirm(`Delete project "${name}" and its network? This cannot be undone.`)) return;
    deleteMutation.mutate(id);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });
  }
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-sm">{projects.length} projects</h1>
    <a href="/dashboard/projects/new">
      <Button size="sm" variant="outline">
        <PlusIcon class="size-3.5 mr-1.5" /> New Project
      </Button>
    </a>
  </div>

  {#if projectsQuery.isPending}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each Array(3) as _, i (i)}
        <div class="bg-card border rounded-xl p-4 animate-pulse space-y-3">
          <div class="flex items-center gap-2">
            <div class="size-3 rounded-full bg-muted"></div>
            <div class="h-4 bg-muted rounded w-32"></div>
          </div>
          <div class="h-3 bg-muted rounded w-48"></div>
        </div>
      {/each}
    </div>

  {:else if projectsQuery.isError}
    <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
      {projectsQuery.error?.message ?? "Failed to load projects"}
    </div>

  {:else if projects.length === 0}
    <div class="bg-card border rounded-xl py-16 text-center">
      <div class="size-12 bg-muted rounded-xl flex items-center justify-center mx-auto mb-3">
        <NetworkIcon class="size-5 text-muted-foreground" />
      </div>
      <p class="text-sm font-medium mb-1">No projects yet</p>
      <p class="text-xs text-muted-foreground mb-4">
        Create a project to group containers with a shared network
      </p>
      <a href="/dashboard/projects/new">
        <Button size="sm"><PlusIcon class="size-3.5 mr-1.5" /> New Project</Button>
      </a>
    </div>

  {:else}
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {#each projects as p (p.id)}
        <div class="bg-card border rounded-xl p-4 hover:border-primary/40 hover:shadow-sm transition-all group relative">
          <div class="flex items-start justify-between mb-2">
            <div class="flex items-center gap-2">
              <div class="size-3 rounded-full shrink-0" style="background: {p.color}"></div>
              <h3 class="font-medium text-sm">{p.name}</h3>
            </div>
            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                      variant="ghost"
                      size="icon"
                      class="size-6 text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending && deleteMutation.variables === p.id}
                      onclick={(e) => { e.preventDefault(); deleteProject(p.id, p.name); }}
              >
                <Trash2Icon class="size-3" />
              </Button>
            </div>
          </div>

          {#if p.description}
            <p class="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>
          {/if}

          <div class="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
            <NetworkIcon class="size-3" />
            <span class="font-mono truncate">{p.network_name}</span>
          </div>

          <div class="flex items-center justify-between pt-2 border-t">
            <span class="text-xs text-muted-foreground">{formatDate(p.created_at)}</span>
            <a href="/dashboard/projects/{p.id}" class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View <ChevronRightIcon class="size-3" />
            </a>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>