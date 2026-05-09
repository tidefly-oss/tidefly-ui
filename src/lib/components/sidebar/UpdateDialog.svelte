<script lang="ts">
    import { CircleArrowUp, ExternalLinkIcon, Loader } from "@lucide/svelte";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { auth } from "$lib/stores/auth.svelte";
    import { updateStore } from "$lib/stores/update.svelte.js";

    interface Props {
        open: boolean;
    }

    let { open = $bindable() }: Props = $props();

    const isAdmin = $derived(auth.user?.role === "admin");

    $effect(() => {
        if (open) updateStore.fetchNotes();
    });

    function renderMarkdown(md: string): string {
        return md
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/^```\w*\n([\s\S]*?)```$/gm, '<pre class="bg-muted rounded-md px-3 py-2 my-2 overflow-x-auto text-xs font-mono text-foreground">$1</pre>')
            .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold mt-4 mb-1.5 text-foreground">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-5 mb-2 text-foreground border-b border-border pb-1.5">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">$1</code>')
            .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-sm text-muted-foreground leading-relaxed">$1</li>')
            .replace(/(<li[\s\S]*?<\/li>\n?)+/g, (match) => `<ul class="my-2 space-y-1">${match}</ul>`)
            .replace(/\n\n/g, '<div class="my-2"></div>')
            .replace(/\n/g, "<br/>");
    }

    const componentLabel: Record<string, string> = {
        plane: "Plane (Backend)",
        ui: "Dashboard (UI)",
        agent: "Agent",
    };
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="max-w-2xl flex flex-col max-h-[85vh]">
        <Dialog.Header class="shrink-0 pb-4">
            <div class="flex items-center gap-4">
                <div class="bg-primary/10 rounded-xl p-3 shrink-0">
                    <CircleArrowUp class="size-5 text-primary" />
                </div>
                <div class="flex-1 min-w-0">
                    <Dialog.Title class="text-lg">Updates Available</Dialog.Title>
                    <Dialog.Description class="text-sm text-muted-foreground mt-0.5">
                        {updateStore.components.filter(c => c.update_available).length} of {updateStore.components.length} components have updates
                    </Dialog.Description>
                </div>
            </div>
        </Dialog.Header>

        <!-- Component status list -->
        <div class="shrink-0 grid gap-2 mb-4">
            {#each updateStore.components as component (component.name)}
                <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium text-foreground">
                                {componentLabel[component.name] ?? component.name}
                            </span>
                            {#if component.prerelease}
                                <span class="text-xs bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 px-1.5 py-0.5 rounded-full">pre-release</span>
                            {/if}
                        </div>
                        <div class="flex items-center gap-1.5 mt-0.5">
                            <span class="text-xs font-mono text-muted-foreground">{component.current}</span>
                            {#if component.update_available}
                                <span class="text-xs text-primary">→</span>
                                <span class="text-xs font-mono text-primary font-semibold">{component.latest}</span>
                            {/if}
                        </div>
                    </div>
                    {#if component.update_available}
                        <span class="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium shrink-0">
                            Update available
                        </span>
                    {:else if component.current === "unknown"}
                        <span class="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full shrink-0">
                            Not running
                        </span>
                    {:else}
                        <span class="text-xs bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0">
                            Up to date
                        </span>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Changelog -->
        <div class="flex-1 overflow-y-auto min-h-0 border-t border-border pt-4">
            {#if updateStore.loadingNotes}
                <div class="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                    <Loader class="size-4 animate-spin" />
                    <span class="text-sm">Loading release notes...</span>
                </div>
            {:else if updateStore.releaseNotes}
                <div class="prose-sm text-muted-foreground px-1">
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                    {@html renderMarkdown(updateStore.releaseNotes)}
                </div>
            {:else}
                <div class="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <p class="text-sm text-muted-foreground">No release notes available.</p>
                </div>
            {/if}
        </div>

        <Dialog.Footer class="shrink-0 border-t border-border pt-4 flex gap-2">
            <Button variant="outline" onclick={() => (open = false)}>Dismiss</Button>
            {#each updateStore.components.filter(c => c.update_available) as component (component.name)}
                <a href={component.release_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" class="gap-2 capitalize">
                        {componentLabel[component.name] ?? component.name} on GitHub
                        <ExternalLinkIcon class="size-3.5" />
                    </Button>
                </a>
            {/each}
            {#if isAdmin && updateStore.hasUpdate}
                <Button
                        class="flex-1 gap-2"
                        onclick={() => updateStore.triggerUpdate()}
                        disabled={updateStore.updating}
                >
                    {#if updateStore.updating}
                        <Loader class="size-4 animate-spin" />
                        Updating...
                    {:else}
                        <CircleArrowUp class="size-4" />
                        Update all
                    {/if}
                </Button>
            {/if}
        </Dialog.Footer>
    </Dialog.Content>
</Dialog.Root>