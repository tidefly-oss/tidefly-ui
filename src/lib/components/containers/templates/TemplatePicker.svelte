<script lang="ts">
    import { DatabaseIcon, LoaderIcon, SearchIcon, ChevronRightIcon } from "@lucide/svelte";
    import type { TemplateSummary } from "$lib/api/v1/types";

    type Props = {
        summaries: TemplateSummary[];
        loading: boolean;
        onSelect: (slug: string) => void;
    };

    let { summaries, loading, onSelect }: Props = $props();

    let search = $state("");
    let activeCategory = $state<string | null>(null);

    const categories = $derived([...new Set(summaries.map((t) => t.category))].sort());

    const filtered = $derived(
        summaries.filter((t) => {
            const matchesCategory = !activeCategory || t.category === activeCategory;
            const q = search.toLowerCase();
            const matchesSearch =
                !q ||
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                (t.tags ?? []).some((tag) => tag.toLowerCase().includes(q));
            return matchesCategory && matchesSearch;
        })
    );

    const grouped = $derived(
        filtered.reduce<Record<string, TemplateSummary[]>>((acc, t) => {
            if (!acc[t.category]) acc[t.category] = [];
            acc[t.category].push(t);
            return acc;
        }, {})
    );

    const categoryColor: Record<string, string> = {
        database: "bg-blue-500/10 text-blue-500",
        cache: "bg-orange-500/10 text-orange-500",
        messaging: "bg-purple-500/10 text-purple-500",
        devtools: "bg-green-500/10 text-green-500",
        utilities: "bg-green-500/10 text-green-500",
        automation: "bg-pink-500/10 text-pink-500",
        monitoring: "bg-yellow-500/10 text-yellow-500",
        auth: "bg-red-500/10 text-red-500",
    };

    const categoryLabel: Record<string, string> = {
        database: "Databases",
        cache: "Caches",
        messaging: "Messaging",
        devtools: "Dev Tools",
        utilities: "Utilities",
        automation: "Automation",
        monitoring: "Monitoring",
        auth: "Auth",
    };
</script>

<div class="space-y-4">
    <div>
        <h1 class="text-lg font-semibold">Deploy a Service</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Choose a template to get started</p>
    </div>

    <!-- Search + Filter -->
    <div class="flex gap-2 flex-wrap">
        <div class="relative flex-1 min-w-48">
            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <input
                    type="text"
                    placeholder="Search templates..."
                    bind:value={search}
                    class="w-full pl-9 pr-3 py-2 text-sm bg-card border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
            />
        </div>
        <div class="flex gap-1.5 flex-wrap">
            <button
                    onclick={() => (activeCategory = null)}
                    class="px-3 py-1.5 text-xs rounded-lg border transition-colors {!activeCategory
					? 'border-primary bg-primary/5 text-primary'
					: 'hover:border-primary/40 text-muted-foreground'}"
            >
                All
            </button>
            {#each categories as cat}
                <button
                        onclick={() => (activeCategory = activeCategory === cat ? null : cat)}
                        class="px-3 py-1.5 text-xs rounded-lg border transition-colors {activeCategory === cat
						? 'border-primary bg-primary/5 text-primary'
						: 'hover:border-primary/40 text-muted-foreground'}"
                >
                    {categoryLabel[cat] ?? cat}
                </button>
            {/each}
        </div>
    </div>

    <!-- Results -->
    {#if filtered.length === 0}
        <div class="bg-card border rounded-xl py-16 text-center">
            <p class="text-sm text-muted-foreground">No templates found for "{search}"</p>
        </div>
    {:else}
        {#each Object.entries(grouped) as [category, templates]}
            <div class="space-y-2">
                <h2 class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {categoryLabel[category] ?? category}
                </h2>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {#each templates as tmpl (tmpl.slug)}
                        <button
                                onclick={() => onSelect(tmpl.slug)}
                                disabled={loading}
                                class="bg-card border rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group flex flex-col gap-3 disabled:opacity-50"
                        >
							<span class="flex items-start justify-between">
								<span class="rounded-lg p-2 {categoryColor[tmpl.category] ?? 'bg-muted text-muted-foreground'}">
									{#if loading}
										<LoaderIcon class="size-4 animate-spin" />
									{:else}
										<DatabaseIcon class="size-4" />
									{/if}
								</span>
								<ChevronRightIcon class="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
							</span>
                            <span class="flex flex-col gap-0.5">
								<span class="font-medium text-sm">{tmpl.name}</span>
								<span class="text-xs text-muted-foreground line-clamp-2">{tmpl.description}</span>
							</span>
                            {#if tmpl.tags && tmpl.tags.length > 0}
								<span class="flex gap-1 flex-wrap">
									{#each tmpl.tags.slice(0, 3) as tag}
										<span class="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
									{/each}
								</span>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>