<script lang="ts">
import { CheckIcon, Loader, PencilIcon, Trash2Icon, XIcon } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button/index.js";

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

type Props = {
	project: { name: string; description: string; color: string };
	editing: boolean;
	saving: boolean;
	deleting: boolean;
	editName: string;
	editDescription: string;
	editColor: string;
	editError: string | null;
	onStartEdit: () => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
	onDeleteClick: () => void;
	onEditNameChange: (v: string) => void;
	onEditDescriptionChange: (v: string) => void;
	onEditColorChange: (v: string) => void;
};

let {
	project,
	editing,
	saving,
	deleting,
	editName,
	editDescription,
	editColor,
	editError,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	onDeleteClick,
	onEditNameChange,
	onEditDescriptionChange,
	onEditColorChange,
}: Props = $props();
</script>

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
                            onclick={() => onEditColorChange(c)}
                            class="size-5 rounded-full transition-transform hover:scale-110 {editColor === c ? 'ring-2 ring-offset-1 ring-ring scale-110' : ''}"
                            style="background: {c}"
                            aria-label="Select color {c}"
                    ></button>
                {/each}
            </div>
            <input
                    type="text"
                    value={editName}
                    oninput={(e) => onEditNameChange((e.target as HTMLInputElement).value)}
                    placeholder="Project name"
                    class="w-full px-3 py-1.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <textarea
                    value={editDescription}
                    oninput={(e) => onEditDescriptionChange((e.target as HTMLTextAreaElement).value)}
                    placeholder="Description (optional)"
                    rows="2"
                    class="w-full px-3 py-1.5 text-sm bg-background border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            ></textarea>
            <div class="flex gap-2">
                <Button size="sm" onclick={onSaveEdit} disabled={saving}>
                    {#if saving}<Loader class="size-3 mr-1 animate-spin" />{:else}<CheckIcon class="size-3 mr-1" />{/if}
                    Save
                </Button>
                <Button size="sm" variant="outline" onclick={onCancelEdit} disabled={saving}>
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
                <Button variant="outline" size="sm" onclick={onStartEdit}>
                    <PencilIcon class="size-3 mr-1.5" /> Edit
                </Button>
                <Button variant="destructive" size="sm" disabled={deleting} onclick={onDeleteClick}>
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