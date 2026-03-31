<script lang="ts">
  import { goto } from "$app/navigation";
  import { ApiError } from "$lib/api/client";
  import { Button } from "$lib/components/ui/button/index.js";
  import { projectsApi } from "$lib/api";
  import { createMutation, useQueryClient } from "@tanstack/svelte-query";
  import { projectKeys } from "$lib/queries/projects.js";
  import { LoaderCircle } from "@lucide/svelte";

  const qc = useQueryClient();

  const COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#06b6d4",
    "#64748b",
    "#78716c",
  ];

  let name = $state("");
  let description = $state("");
  let color = $state("#6366f1");
  let error = $state<string | null>(null);

  const networkPreview = $derived(
          name ? `tidefly_${name.toLowerCase().replace(/[^a-z0-9_-]/g, "_")}` : "",
  );

  const createMut = createMutation(() => ({
    mutationFn: () =>
            projectsApi.create({
              name: name.trim(),
              description: description.trim() || undefined,
              color,
            }),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all() }),
  }));

  const submitting = $derived(createMut.isPending);

  async function submit() {
    if (!name.trim()) {
      error = "Name is required";
      return;
    }
    error = null;
    try {
      const project = await createMut.mutateAsync();
      await goto(`/dashboard/projects/${project.id}`);
    } catch (e) {
      error = e instanceof ApiError ? e.message : "Failed to create project";
    }
  }
</script>

<div class="space-y-4 max-w-lg">
  <div>
    <h1 class="text-lg font-semibold">New Project</h1>
    <p class="text-sm text-muted-foreground">
      A project creates a shared Docker network for your containers.
    </p>
  </div>

  <div class="bg-card border rounded-xl p-5 space-y-4">
    {#if error}
      <div
              class="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-3 py-2 text-sm"
      >
        {error}
      </div>
    {/if}

    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="name"
      >Name <span class="text-destructive">*</span></label
      >
      <input
              id="name"
              type="text"
              placeholder="my-project"
              bind:value={name}
              disabled={submitting}
              class="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
      />
      {#if networkPreview}
        <p class="text-xs text-muted-foreground">
          Network: <span class="font-mono">{networkPreview}</span>
        </p>
      {/if}
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="description">Description</label>
      <textarea
              id="description"
              placeholder="Optional description..."
              bind:value={description}
              disabled={submitting}
              rows="2"
              class="w-full px-3 py-2 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 resize-none"
      ></textarea>
    </div>

    <div class="space-y-1.5">
      <label class="text-sm font-medium" for="color-group">Color</label>
      <div
              id="color-group"
              class="flex flex-wrap gap-2"
              role="group"
              aria-label="Color"
      >
        {#each COLORS as c}
          <button
                  type="button"
                  onclick={() => (color = c)}
                  class="size-6 rounded-full transition-transform hover:scale-110 {color === c
              ? 'ring-2 ring-offset-2 ring-ring scale-110'
              : ''}"
                  style="background: {c}"
                  aria-label={`Select color ${c}`}
          ></button>
        {/each}
      </div>
    </div>

    <div class="bg-muted/50 rounded-lg p-3 flex items-center gap-2.5">
      <div class="size-3 rounded-full shrink-0" style="background: {color}"></div>
      <span class="text-sm font-medium">{name || "Project name"}</span>
      {#if description}
        <span class="text-xs text-muted-foreground truncate">— {description}</span>
      {/if}
    </div>

    <div class="flex items-center gap-2 pt-1">
      <Button onclick={submit} disabled={submitting || !name.trim()}>
        {#if submitting}<LoaderCircle class="size-3.5 mr-1.5 animate-spin" />{/if}
        Create Project
      </Button>
      <a href="/dashboard/projects"><Button variant="outline">Cancel</Button></a>
    </div>
  </div>
</div>