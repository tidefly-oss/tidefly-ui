<script lang="ts">
import { CheckIcon, ChevronDownIcon, CircleIcon, FolderIcon, Loader2Icon } from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import { toast } from "svelte-sonner";
import { adminApi } from "$lib/api/v1/admin";
import { projectsApi } from "$lib/api/v1/projects";
import type { AdminUser } from "$lib/api/v1/types";
import { Button } from "$lib/components/ui/button/index.js";

let { user }: { user: AdminUser } = $props();

const qc = useQueryClient();

const projectsQuery = createQuery(() => ({
	queryKey: ["projects"],
	queryFn: () => projectsApi.list(),
	staleTime: 60_000,
}));

const allProjects = $derived(projectsQuery.data ?? []);

let selected = $state<Set<string>>(new Set<string>());
let open = $state(false);
let triggerEl = $state<HTMLButtonElement | null>(null);
let pos = $state({ top: 0, left: 0 });

$effect(() => {
	selected = new Set(user.project_ids);
});

function openDropdown() {
	if (triggerEl) {
		const rect = triggerEl.getBoundingClientRect();
		pos = {
			top: rect.bottom + window.scrollY + 4,
			left: rect.left + window.scrollX,
		};
	}
	open = !open;
}

function onClickOutside(e: MouseEvent) {
	const t = e.target as HTMLElement;
	if (!t.closest("[data-projects-popover]") && !t.closest("[data-projects-dropdown]")) {
		cancel();
	}
}

$effect(() => {
	if (open) {
		setTimeout(() => document.addEventListener("click", onClickOutside), 0);
	} else {
		document.removeEventListener("click", onClickOutside);
	}
	return () => document.removeEventListener("click", onClickOutside);
});

const saveMut = createMutation(() => ({
	mutationFn: () => adminApi.setUserProjects(user.id, [...selected]),
	onSuccess: (updated) => {
		qc.setQueryData<{ users: AdminUser[] }>(["admin-users"], (old) =>
			old ? { users: old.users.map((u) => (u.id === updated.id ? updated : u)) } : old
		);
		toast.success("Projects updated");
		open = false;
	},
	onError: () => toast.error("Failed to update projects"),
}));

function toggle(id: string) {
	const next = new Set(selected);
	if (next.has(id)) next.delete(id);
	else next.add(id);
	selected = next;
}

function cancel() {
	selected = new Set(user.project_ids);
	open = false;
}

const isDirty = $derived(
	JSON.stringify([...selected].sort()) !== JSON.stringify([...user.project_ids].sort())
);

const assignedCount = $derived(user.project_ids.length);
</script>

<!-- Trigger -->
<div data-projects-popover>
    <button
            bind:this={triggerEl}
            onclick={openDropdown}
            class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
        {#if assignedCount === 0}
            <FolderIcon class="size-3 opacity-40" />
            <span class="opacity-40">None</span>
        {:else}
            <FolderIcon class="size-3 text-primary" />
            <span class="font-medium text-foreground">{assignedCount}</span>
            <span class="opacity-60">{assignedCount === 1 ? 'project' : 'projects'}</span>
        {/if}
        <ChevronDownIcon class="size-3 opacity-40 transition-transform {open ? 'rotate-180' : ''}" />
    </button>
</div>

<!-- Dropdown — rendered via portal pattern using fixed positioning -->
{#if open}
    <div
            data-projects-dropdown
            class="fixed z-50 w-60 bg-popover border rounded-xl shadow-lg overflow-hidden"
            style="top: {pos.top}px; left: {pos.left}px;"
    >
        <div class="px-3 py-2.5 border-b">
            <p class="text-xs font-medium">Project Access</p>
            <p class="text-xs text-muted-foreground mt-0.5 truncate">
                {user.name} can access selected projects
            </p>
        </div>

        <div class="max-h-52 overflow-y-auto">
            {#if projectsQuery.isPending}
                <div class="flex items-center justify-center py-6">
                    <Loader2Icon class="size-4 animate-spin text-muted-foreground" />
                </div>
            {:else if allProjects.length === 0}
                <div class="px-3 py-4 text-xs text-muted-foreground text-center">
                    No projects yet
                </div>
            {:else}
                {#each allProjects as project (project.id)}
                    {@const isSelected = selected.has(project.id)}
                    <button
                            onclick={() => toggle(project.id)}
                            class="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-muted/50 transition-colors"
                    >
                        <div class="size-4 rounded border flex items-center justify-center shrink-0 transition-colors
                            {isSelected ? 'bg-primary border-primary' : 'border-border'}">
                            {#if isSelected}
                                <CheckIcon class="size-2.5 text-primary-foreground" />
                            {/if}
                        </div>
                        <CircleIcon class="size-2 fill-current shrink-0" style="color: {project.color}" />
                        <span class="text-sm flex-1 truncate">{project.name}</span>
                    </button>
                {/each}
            {/if}
        </div>

        <div class="px-3 py-2.5 border-t flex items-center justify-between gap-2">
            <span class="text-xs text-muted-foreground">{selected.size} selected</span>
            <div class="flex gap-1.5">
                <Button size="sm" variant="ghost" class="h-7 text-xs px-2" onclick={cancel}>
                    Cancel
                </Button>
                <Button
                        size="sm"
                        class="h-7 text-xs px-3"
                        disabled={!isDirty || saveMut.isPending}
                        onclick={() => saveMut.mutate()}
                >
                    {#if saveMut.isPending}
                        <Loader2Icon class="size-3 animate-spin mr-1" />
                    {/if}
                    Save
                </Button>
            </div>
        </div>
    </div>
{/if}