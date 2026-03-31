<script lang="ts">
import { SiBitbucket, SiGitea, SiGithub, SiGitlab } from "@icons-pack/svelte-simple-icons";
import {
	CircleCheckIcon,
	CircleXIcon,
	GitBranchIcon,
	Loader,
	PlusIcon,
	RocketIcon,
	ShareIcon,
	ShieldCheckIcon,
	Trash2Icon,
} from "@lucide/svelte";
import { createMutation, createQuery, useQueryClient } from "@tanstack/svelte-query";
import type { Component } from "svelte";
import { toast } from "svelte-sonner";
import { gitApi } from "$lib/api/v1/git";
import type { GitIntegration } from "$lib/api/v1/types/git.js";
import { providerMeta } from "$lib/api/v1/types/git.js";
import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";
import GitSharePopover from "./GitSharePopover.svelte";

const qc = useQueryClient();

const query = createQuery(() => ({
	queryKey: ["git-integrations"],
	queryFn: () => gitApi.list(),
}));

const integrations = $derived(query.data ?? []);

// ── Validate ──────────────────────────────────────────────────────────────

let validatingId = $state<string | null>(null);
let validResults = $state<Record<string, boolean>>({});

async function validate(id: string) {
	validatingId = id;
	try {
		const r = await gitApi.validate(id);
		validResults = { ...validResults, [id]: r.valid };
		toast[r.valid ? "success" : "error"](r.valid ? "Token valid" : (r.error ?? "Token invalid"));
	} catch {
		toast.error("Validation failed");
	} finally {
		validatingId = null;
	}
}

// ── Delete ────────────────────────────────────────────────────────────────

const deleteMut = createMutation(() => ({
	mutationFn: (id: string) => gitApi.delete(id),
	onSuccess: (_, id) => {
		qc.setQueryData<GitIntegration[]>(["git-integrations"], (old) =>
			old ? old.filter((i) => i.id !== id) : old
		);
		toast.success("Integration deleted");
	},
	onError: () => toast.error("Failed to delete integration"),
}));

// ── Helpers ───────────────────────────────────────────────────────────────

function providerIcon(provider: string): Component {
	const map: Record<string, Component> = {
		github: SiGithub,
		gitlab: SiGitlab,
		gitea: SiGitea,
		forgejo: SiGitea,
		bitbucket: SiBitbucket,
	};
	return map[provider] ?? GitBranchIcon;
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleDateString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}
</script>

<div class="space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-xl font-semibold">Git Integrations</h1>
            <p class="text-sm text-muted-foreground mt-0.5">Connect Git providers to deploy from source</p>
        </div>
        <a href="/dashboard/git/new">
            <Button size="sm" class="gap-1.5">
                <PlusIcon class="size-3.5" /> Add Integration
            </Button>
        </a>
    </div>

    <!-- List -->
    <div class="bg-card border rounded-xl overflow-hidden">
        {#if query.isPending}
            {#each Array(3) as _, i (i)}
                <div class="px-4 py-4 border-b flex items-center gap-4 animate-pulse">
                    <div class="size-9 rounded-lg bg-muted shrink-0"></div>
                    <div class="flex-1 space-y-1.5">
                        <div class="h-3.5 bg-muted rounded w-36"></div>
                        <div class="h-3 bg-muted rounded w-24"></div>
                    </div>
                    <div class="h-5 bg-muted rounded w-16"></div>
                </div>
            {/each}
        {:else if query.isError}
            <div class="px-4 py-8 text-center text-sm text-destructive">{query.error.message}</div>
        {:else if integrations.length === 0}
            <div class="px-4 py-16 text-center">
                <GitBranchIcon class="size-10 mx-auto mb-3 text-muted-foreground/30" />
                <p class="text-sm font-medium">No integrations yet</p>
                <p class="text-xs text-muted-foreground mt-1">Connect a Git provider to deploy from source</p>
                <a href="/dashboard/git/new">
                    <Button size="sm" variant="outline" class="mt-3">
                        <PlusIcon class="size-3.5 mr-1.5" /> Add your first integration
                    </Button>
                </a>
            </div>
        {:else}
            {#each integrations as integration (integration.id)}
                {@const meta = providerMeta[integration.provider]}
                {@const Icon = providerIcon(integration.provider)}
                {@const validResult = validResults[integration.id]}
                <div class="px-4 py-3.5 border-b last:border-0 flex items-center gap-3 hover:bg-muted/20 transition-colors">

                    <!-- Provider icon -->
                    <div class="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon class="size-4" style="color: {meta.color}" />
                    </div>

                    <!-- Name + meta -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-medium truncate">{integration.name}</span>
                            {#if !integration.is_owner}
                                <Badge variant="secondary" class="text-xs gap-1 shrink-0">
                                    <ShareIcon class="size-2.5" /> Shared
                                </Badge>
                            {/if}
                            {#if validResult === true}
                                <CircleCheckIcon class="size-3.5 text-green-500 shrink-0" />
                            {:else if validResult === false}
                                <CircleXIcon class="size-3.5 text-destructive shrink-0" />
                            {/if}
                        </div>
                        <p class="text-xs text-muted-foreground mt-0.5">
                            {meta.label}{integration.base_url ? ` · ${integration.base_url}` : ''}
                            · Added {formatDate(integration.created_at)}
                        </p>
                    </div>

                    <!-- Share (owner only) -->
                    {#if integration.is_owner}
                        <div class="shrink-0">
                            <GitSharePopover {integration} />
                        </div>
                    {/if}

                    <!-- Actions -->
                    <div class="flex items-center gap-1">
                        <!-- Deploy — everyone -->
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <a href="/dashboard/git/deploy">
                                    <Button variant="ghost" size="icon" class="size-7 text-muted-foreground hover:text-foreground">
                                        <RocketIcon class="size-3.5" />
                                    </Button>
                                </a>
                            </Tooltip.Trigger>
                            <Tooltip.Content>Deploy from repo</Tooltip.Content>
                        </Tooltip.Root>

                        {#if integration.is_owner}
                            <!-- Validate -->
                            <Tooltip.Root>
                                <Tooltip.Trigger>
                                    <Button
                                            variant="ghost" size="icon"
                                            class="size-7 text-muted-foreground hover:text-foreground"
                                            disabled={validatingId === integration.id}
                                            onclick={() => validate(integration.id)}
                                    >
                                        {#if validatingId === integration.id}
                                            <Loader class="size-3.5 animate-spin" />
                                        {:else}
                                            <ShieldCheckIcon class="size-3.5" />
                                        {/if}
                                    </Button>
                                </Tooltip.Trigger>
                                <Tooltip.Content>Validate token</Tooltip.Content>
                            </Tooltip.Root>

                            <!-- Delete -->
                            <AlertDialog.Root>
                                <AlertDialog.Trigger>
                                    {#snippet child({ props })}
                                        <Button
                                                {...props}
                                                variant="ghost" size="icon"
                                                class="size-7 text-destructive hover:text-destructive"
                                                disabled={deleteMut.isPending && deleteMut.variables === integration.id}
                                        >
                                            <Trash2Icon class="size-3.5" />
                                        </Button>
                                    {/snippet}
                                </AlertDialog.Trigger>
                                <AlertDialog.Content>
                                    <AlertDialog.Header>
                                        <AlertDialog.Title>Delete "{integration.name}"?</AlertDialog.Title>
                                        <AlertDialog.Description>
                                            This will remove the integration and revoke access for all shared projects.
                                            The token will be deleted from the server. This action cannot be undone.
                                        </AlertDialog.Description>
                                    </AlertDialog.Header>
                                    <AlertDialog.Footer>
                                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                                        <AlertDialog.Action
                                                class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                onclick={() => deleteMut.mutate(integration.id)}
                                        >
                                            Delete
                                        </AlertDialog.Action>
                                    </AlertDialog.Footer>
                                </AlertDialog.Content>
                            </AlertDialog.Root>
                        {/if}
                    </div>

                </div>
            {/each}
        {/if}
    </div>
</div>