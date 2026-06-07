<script lang="ts">
	import {
		BadgeCheck,
		CircleArrowUp,
		CircleX,
		ExternalLinkIcon,
		Loader,
	} from "@lucide/svelte";
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
			.replace(
				/^```\w*\n([\s\S]*?)```$/gm,
				'<pre class="bg-muted rounded-md px-3 py-2 my-2 overflow-x-auto text-xs font-mono text-foreground">$1</pre>',
			)
			.replace(
				/^### (.+)$/gm,
				'<h3 class="text-sm font-semibold mt-4 mb-1.5 text-foreground">$1</h3>',
			)
			.replace(
				/^## (.+)$/gm,
				'<h2 class="text-base font-semibold mt-5 mb-2 text-foreground border-b border-border pb-1.5">$1</h2>',
			)
			.replace(
				/^# (.+)$/gm,
				'<h1 class="text-lg font-bold mt-5 mb-2 text-foreground">$1</h1>',
			)
			.replace(
				/\*\*(.+?)\*\*/g,
				'<strong class="font-semibold text-foreground">$1</strong>',
			)
			.replace(
				/`([^`]+)`/g,
				'<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground">$1</code>',
			)
			.replace(
				/^[-*] (.+)$/gm,
				'<li class="ml-4 list-disc text-sm text-muted-foreground leading-relaxed">$1</li>',
			)
			.replace(
				/(<li[\s\S]*?<\/li>\n?)+/g,
				(match) => `<ul class="my-2 space-y-1">${match}</ul>`,
			)
			.replace(/\n\n/g, '<div class="my-2"></div>')
			.replace(/\n/g, "<br/>");
	}

	const componentLabel: Record<string, string> = {
		plane: "Plane (Backend)",
		ui: "Dashboard (UI)",
		agent: "Agent",
		caddy: "Caddy (Proxy)",
	};

	const componentIcon: Record<string, string> = {
		plane: "⚙️",
		ui: "🖥️",
		agent: "🤖",
		caddy: "🔀",
	};

	const latestProgress = $derived(
		updateStore.progressMessages[updateStore.progressMessages.length - 1]
			?.message ?? "",
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-3xl flex flex-col max-h-[85vh]">
		<Dialog.Header class="shrink-0 pb-4">
			<div class="flex items-center gap-4">
				<div
					class="rounded-xl p-3 shrink-0 {updateStore.updateDone
						? 'bg-green-500/10'
						: updateStore.updateError
							? 'bg-destructive/10'
							: 'bg-primary/10'}"
				>
					{#if updateStore.updateDone}
						<BadgeCheck class="size-5 text-green-500" />
					{:else if updateStore.updateError}
						<CircleX class="size-5 text-destructive" />
					{:else}
						<CircleArrowUp class="size-5 text-primary" />
					{/if}
				</div>
				<div class="flex-1 min-w-0">
					<Dialog.Title class="text-lg">
						{#if updateStore.updateDone}
							Update complete
						{:else if updateStore.updateError}
							Update failed
						{:else}
							Updates Available
						{/if}
					</Dialog.Title>
					<Dialog.Description
						class="text-sm text-muted-foreground mt-0.5"
					>
						{#if updateStore.updateDone}
							All components have been updated successfully.
						{:else if updateStore.updateError}
							{updateStore.updateError}
						{:else}
							{updateStore.components.filter(
								(c) => c.update_available,
							).length} of {updateStore.components.length} components
							have updates
						{/if}
					</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		<!-- Component list -->
		{#if !updateStore.updating && !updateStore.updateDone}
			<div class="shrink-0 grid gap-2 mb-4">
				{#each updateStore.components as component (component.name)}
					<div
						class="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-muted/30"
					>
						<span class="text-base shrink-0"
							>{componentIcon[component.name] ?? "📦"}</span
						>
						<div class="flex-1 min-w-0">
							<div class="flex items-center gap-2">
								<span
									class="text-sm font-medium text-foreground"
								>
									{componentLabel[component.name] ??
										component.name}
								</span>
								{#if component.prerelease}
									<span
										class="text-xs bg-yellow-500/15 text-yellow-500 border border-yellow-500/25 px-1.5 py-0.5 rounded-full"
										>pre-release</span
									>
								{/if}
							</div>
							<div class="flex items-center gap-1.5 mt-0.5">
								<span
									class="text-xs font-mono text-muted-foreground"
									>{component.current}</span
								>
								{#if component.update_available}
									<span class="text-xs text-primary">→</span>
									<span
										class="text-xs font-mono text-primary font-semibold"
										>{component.latest}</span
									>
								{/if}
							</div>
						</div>
						{#if component.update_available}
							<span
								class="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-medium shrink-0"
							>
								Update available
							</span>
						{:else if component.current === "unknown"}
							<span
								class="text-xs bg-muted text-muted-foreground border border-border px-2 py-0.5 rounded-full shrink-0"
							>
								Not running
							</span>
						{:else}
							<span
								class="text-xs bg-green-500/10 text-green-500 border border-green-500/20 px-2 py-0.5 rounded-full shrink-0"
							>
								Up to date
							</span>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<!-- Update progress -->
		{#if updateStore.updating}
			<div
				class="shrink-0 mb-4 rounded-lg border border-border bg-muted/20 p-4 space-y-3"
			>
				<div class="flex items-center gap-2">
					<Loader class="size-4 animate-spin text-primary shrink-0" />
					<span class="text-sm font-medium"
						>Updating — do not close this window</span
					>
				</div>
				{#if latestProgress}
					<p class="text-xs text-muted-foreground font-mono truncate">
						{latestProgress}
					</p>
				{/if}
				<div class="space-y-1 max-h-32 overflow-y-auto">
					{#each updateStore.progressMessages as msg (msg.ts)}
						<p class="text-xs text-muted-foreground font-mono">
							{msg.message}
						</p>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Success state -->
		{#if updateStore.updateDone}
			<div
				class="shrink-0 mb-4 rounded-lg border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3"
			>
				<BadgeCheck class="size-5 text-green-500 shrink-0" />
				<div>
					<p class="text-sm font-medium text-green-500">
						All components updated successfully
					</p>
					<p class="text-xs text-muted-foreground mt-0.5">
						The page will reload shortly.
					</p>
				</div>
			</div>
		{/if}

		<!-- Changelog -->
		{#if !updateStore.updating && !updateStore.updateDone}
			<div
				class="flex-1 overflow-y-auto min-h-0 border-t border-border pt-4"
			>
				{#if updateStore.loadingNotes}
					<div
						class="flex items-center justify-center gap-2 py-10 text-muted-foreground"
					>
						<Loader class="size-4 animate-spin" />
						<span class="text-sm">Loading release notes...</span>
					</div>
				{:else if updateStore.releaseNotes}
					<div class="prose-sm text-muted-foreground px-1">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html renderMarkdown(updateStore.releaseNotes)}
					</div>
				{:else}
					<div
						class="flex flex-col items-center justify-center gap-2 py-10 text-center"
					>
						<p class="text-sm text-muted-foreground">
							No release notes available.
						</p>
					</div>
				{/if}
			</div>
		{/if}

		<Dialog.Footer
			class="shrink-0 border-t border-border pt-4 flex-row gap-2"
		>
			{#if updateStore.updateDone}
				<Button onclick={() => (open = false)} class="flex-1"
					>Close</Button
				>
			{:else}
				<Button variant="outline" onclick={() => (open = false)}
					>Dismiss</Button
				>
				{#if !updateStore.updating}
					{#each updateStore.components.filter((c) => c.update_available) as component (component.name)}
						<a
							href={component.release_url}
							target="_blank"
							rel="noopener noreferrer"
							class="flex-1"
						>
							<Button
								variant="outline"
								class="w-full gap-2 capitalize"
							>
								{componentLabel[component.name] ??
									component.name} on GitHub
								<ExternalLinkIcon class="size-3.5" />
							</Button>
						</a>
					{/each}
				{/if}
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
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
