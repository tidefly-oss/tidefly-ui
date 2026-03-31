<script lang="ts">
import { ArrowUpCircleIcon, ExternalLinkIcon, Loader2Icon } from "@lucide/svelte";
import { Button } from "$lib/components/ui/button/index.js";
import * as Dialog from "$lib/components/ui/dialog/index.js";
import { updateStore } from "$lib/stores/update.svelte.js";

interface Props {
	open: boolean;
}

let { open = $bindable() }: Props = $props();

$effect(() => {
	if (open && updateStore.update) {
		updateStore.fetchNotes();
	}
});

// Minimal markdown → HTML renderer
function renderMarkdown(md: string): string {
	return md
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1 text-foreground">$1</h3>')
		.replace(
			/^## (.+)$/gm,
			'<h2 class="text-sm font-semibold mt-5 mb-1.5 text-foreground border-b pb-1">$1</h2>'
		)
		.replace(/^# (.+)$/gm, '<h1 class="text-base font-bold mt-5 mb-2 text-foreground">$1</h1>')
		.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
		.replace(/`([^`]+)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-xs font-mono">$1</code>')
		.replace(
			/^[-*] (.+)$/gm,
			'<li class="ml-4 list-disc text-sm text-muted-foreground leading-relaxed">$1</li>'
		)
		.replace(/(<li.*<\/li>\n?)+/g, (match) => `<ul class="my-1.5 space-y-0.5">${match}</ul>`)
		.replace(/\n\n/g, "<br/><br/>")
		.replace(/\n/g, "<br/>");
}
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="max-w-lg flex flex-col max-h-[80vh]">
        <Dialog.Header class="shrink-0">
            <div class="flex items-center gap-3">
                <div class="bg-primary/10 rounded-lg p-2 shrink-0">
                    <ArrowUpCircleIcon class="size-4 text-primary" />
                </div>
                <div>
                    <Dialog.Title>Update Available</Dialog.Title>
                    {#if updateStore.update}
                        <Dialog.Description class="font-mono text-xs mt-0.5">
                            {updateStore.update.current} → {updateStore.update.latest}
                            {#if updateStore.update.release_name !== updateStore.update.latest}
                                · {updateStore.update.release_name}
                            {/if}
                        </Dialog.Description>
                    {/if}
                </div>
            </div>
        </Dialog.Header>

        <!-- Release notes body -->
        <div class="flex-1 overflow-y-auto min-h-0 my-4 -mx-6 px-6 border-t border-b py-4">
            {#if updateStore.loadingNotes}
                <div class="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                    <Loader2Icon class="size-4 animate-spin" />
                    <span class="text-sm">Loading release notes…</span>
                </div>
            {:else if updateStore.releaseNotes}
                <div class="text-sm leading-relaxed text-muted-foreground">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html renderMarkdown(updateStore.releaseNotes)}
                </div>
            {:else}
                <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <p class="text-sm text-muted-foreground">No release notes available.</p>
                    <p class="text-xs text-muted-foreground">Check the GitHub release page for details.</p>
                </div>
            {/if}
        </div>

        <Dialog.Footer class="shrink-0 flex gap-2">
            <Button variant="outline" onclick={() => (open = false)}>Close</Button>
            {#if updateStore.update}
                <a
                        href={updateStore.update.release_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex-1"
                >
                    <Button class="w-full gap-1.5">
                        View on GitHub
                        <ExternalLinkIcon class="size-3.5" />
                    </Button>
                </a>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>