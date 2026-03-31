<script lang="ts">
    import { goto } from "$app/navigation";
    import { providerMeta } from "$lib/api/v1/types/git.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import { Input } from "$lib/components/ui/input/index.js";
    import { Badge } from "$lib/components/ui/badge/index.js";
    import { agentApi, type WorkerNode } from "$lib/api/v1/agent/index.js";
    import {
        GitBranchIcon, BookOpenIcon, ChevronRightIcon, ChevronLeftIcon,
        CheckIcon, SearchIcon, LockIcon, RocketIcon, PlusIcon, ServerIcon,
    } from "@lucide/svelte";
    import { SiGithub, SiGitlab, SiGitea, SiBitbucket } from "@icons-pack/svelte-simple-icons";
    import { createQuery } from "@tanstack/svelte-query";
    import { gitApi } from "$lib/api/v1/git";

    let step = $state(1);
    let selectedIntegrationId = $state<string | null>(null);
    let selectedRepo = $state<{
        owner: string; name: string; fullName: string;
        defaultBranch: string; private: boolean; cloneUrl: string;
    } | null>(null);
    let selectedBranch = $state("");
    let workerId = $state<string | null>(null); // null = Plane
    let repoSearch = $state("");
    let selectedOwner = $state("all");
    let branchSearch = $state("");

    const integrationsQuery = createQuery(() => ({
        queryKey: ["git-integrations"],
        queryFn: () => gitApi.list(),
    }));

    const reposQuery = createQuery(() => ({
        queryKey: ["git-repos", selectedIntegrationId],
        queryFn: () => gitApi.listRepositories(selectedIntegrationId!),
        enabled: !!selectedIntegrationId && step >= 2,
        staleTime: 60_000,
    }));

    const branchesQuery = createQuery(() => ({
        queryKey: ["git-branches", selectedIntegrationId, selectedRepo?.owner, selectedRepo?.name],
        queryFn: () => gitApi.listBranches(selectedIntegrationId!, selectedRepo!.owner, selectedRepo!.name),
        enabled: !!selectedIntegrationId && !!selectedRepo && step >= 3,
        staleTime: 30_000,
    }));

    const workersQuery = createQuery(() => ({
        queryKey: ["workers"],
        queryFn: () => agentApi.listWorkers(),
        staleTime: 30_000,
    }));

    const integrations = $derived(integrationsQuery.data ?? []);
    const connectedWorkers = $derived(
        (workersQuery.data ?? []).filter((w: WorkerNode) => w.status === "connected")
    );

    const owners = $derived(
        [...new Set((reposQuery.data ?? []).map((r: any) => r.full_name.split("/")[0]))].sort()
    );

    const filteredRepos = $derived(
        (reposQuery.data ?? []).filter((r: any) => {
            const matchOwner = selectedOwner === "all" || r.full_name.startsWith(selectedOwner + "/");
            const matchSearch = !repoSearch || r.full_name.toLowerCase().includes(repoSearch.toLowerCase());
            return matchOwner && matchSearch;
        })
    );

    const branches = $derived(branchesQuery.data ?? []);
    const filteredBranches = $derived(
        branchSearch ? branches.filter((b: any) => b.name.toLowerCase().includes(branchSearch.toLowerCase())) : branches
    );

    // Step 4 only shown when workers are available
    const hasWorkers = $derived(connectedWorkers.length > 0);
    const totalSteps = $derived(hasWorkers ? 4 : 3);

    function selectIntegration(id: string) {
        selectedIntegrationId = id;
        selectedRepo = null;
        selectedBranch = "";
        selectedOwner = "all";
        repoSearch = "";
    }

    function selectRepo(repo: any) {
        selectedRepo = {
            owner: repo.full_name.split("/")[0],
            name: repo.name,
            fullName: repo.full_name,
            defaultBranch: repo.default_branch,
            private: repo.private,
            cloneUrl: repo.clone_url,
        };
        selectedBranch = repo.default_branch;
    }

    function handleDeploy() {
        const params = new URLSearchParams({
            git_url: selectedRepo!.cloneUrl,
            branch: selectedBranch,
            name: selectedRepo!.name.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
            ...(workerId ? { worker_id: workerId } : {}),
        });
        goto(`/dashboard/containers/deploy?${params}`);
    }

    function providerIcon(provider: string) {
        const map: Record<string, any> = {
            github: SiGithub, gitlab: SiGitlab, gitea: SiGitea, forgejo: SiGitea, bitbucket: SiBitbucket,
        };
        return map[provider] ?? GitBranchIcon;
    }

    function workerLabel(w: WorkerNode) {
        return w.name.length > 28 ? w.name.slice(0, 24) + "…" : w.name;
    }

    const steps = $derived([
        { n: 1, label: "Integration" },
        { n: 2, label: "Repository" },
        { n: 3, label: "Branch" },
        ...(hasWorkers ? [{ n: 4, label: "Server" }] : []),
    ]);
</script>

<div class="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
    <div class="w-full max-w-2xl space-y-6">

        <!-- Title -->
        <div class="text-center">
            <h1 class="text-lg font-semibold">Deploy from Git</h1>
            <p class="text-muted-foreground text-sm mt-1">Select a repository and branch to deploy from source.</p>
        </div>

        <!-- Stepper -->
        <div class="flex items-center gap-0">
            {#each steps as s, i (s.n)}
                {@const isActive = step === s.n}
                {@const isDone = step > s.n}
                <div class="flex items-center gap-0 flex-1 last:flex-none">
                    <button
                            onclick={() => { if (isDone) step = s.n; }}
                            class="flex items-center gap-2 shrink-0 {isDone ? 'cursor-pointer' : 'cursor-default'}"
                    >
                        <span class="size-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all
                            {isDone ? 'bg-primary border-primary text-primary-foreground' : isActive ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'}">
                            {#if isDone}<CheckIcon class="size-3.5" />{:else}{s.n}{/if}
                        </span>
                        <span class="text-xs font-medium hidden sm:block {isActive ? 'text-foreground' : isDone ? 'text-primary' : 'text-muted-foreground'}">
                            {s.label}
                        </span>
                    </button>
                    {#if i < steps.length - 1}
                        <div class="flex-1 h-px mx-3 {step > s.n ? 'bg-primary' : 'bg-border'}"></div>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- Step 1: Integration -->
        {#if step === 1}
            <div class="bg-card border rounded-xl p-6 space-y-3">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="font-semibold">Select Integration</h2>
                        <p class="text-sm text-muted-foreground mt-0.5">Choose which Git provider to deploy from.</p>
                    </div>
                    <a href="/dashboard/git/new">
                        <Button size="sm" variant="outline">
                            <PlusIcon class="size-3.5 mr-1" /> Add
                        </Button>
                    </a>
                </div>
                {#if integrationsQuery.isPending}
                    {#each Array(2) as _, i (i)}
                        <div class="h-14 bg-muted rounded-xl animate-pulse"></div>
                    {/each}
                {:else if integrations.length === 0}
                    <div class="text-center py-8">
                        <GitBranchIcon class="size-8 text-muted-foreground mx-auto mb-3" />
                        <p class="text-sm font-medium">No Git integrations</p>
                        <p class="text-sm text-muted-foreground mt-1">Add an integration first.</p>
                    </div>
                {:else}
                    {#each integrations as integration (integration.id)}
                        {@const meta = providerMeta[integration.provider as keyof typeof providerMeta]}
                        {@const Icon = providerIcon(integration.provider)}
                        <button
                                onclick={() => selectIntegration(integration.id)}
                                class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                                {selectedIntegrationId === integration.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
                        >
                            <span class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Icon class="size-4" style="color: {meta.color}" />
                            </span>
                            <span class="flex-1 min-w-0">
                                <span class="text-sm font-medium block">{integration.name}</span>
                                <span class="text-xs text-muted-foreground capitalize block">
                                    {meta.label}{integration.base_url ? ` · ${integration.base_url}` : ""}
                                </span>
                            </span>
                            {#if selectedIntegrationId === integration.id}
                                <CheckIcon class="size-4 text-primary shrink-0" />
                            {/if}
                        </button>
                    {/each}
                {/if}
            </div>
            <div class="flex justify-end">
                <Button onclick={() => (step = 2)} disabled={!selectedIntegrationId}>
                    Continue <ChevronRightIcon class="size-3.5 ml-1.5" />
                </Button>
            </div>

            <!-- Step 2: Repository -->
        {:else if step === 2}
            <div class="bg-card border rounded-xl p-6 space-y-3">
                <div>
                    <h2 class="font-semibold">Select Repository</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Choose the repository you want to deploy.</p>
                </div>

                <div class="relative">
                    <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input class="pl-9 text-sm" placeholder="Search repositories..." bind:value={repoSearch} />
                </div>

                {#if owners.length > 1}
                    <div class="flex flex-wrap gap-1.5">
                        <button
                                onclick={() => (selectedOwner = "all")}
                                class="px-3 py-1 rounded-full text-xs font-medium border transition-colors
                                {selectedOwner === 'all' ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/40'}"
                        >All</button>
                        {#each owners as owner (owner)}
                            <button
                                    onclick={() => (selectedOwner = owner)}
                                    class="px-3 py-1 rounded-full text-xs font-medium border transition-colors
                                    {selectedOwner === owner ? 'bg-primary border-primary text-primary-foreground' : 'border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/40'}"
                            >{owner}</button>
                        {/each}
                    </div>
                {/if}

                <div class="border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {#if reposQuery.isPending}
                        {#each Array(5) as _, i (i)}
                            <div class="px-4 py-3 border-b flex items-center gap-3 animate-pulse">
                                <div class="size-4 bg-muted rounded"></div>
                                <div class="flex-1 space-y-1.5">
                                    <div class="h-3.5 bg-muted rounded w-40"></div>
                                    <div class="h-3 bg-muted rounded w-56"></div>
                                </div>
                            </div>
                        {/each}
                    {:else if reposQuery.isError}
                        <div class="px-4 py-6 text-center text-sm text-destructive">Failed to load repositories.</div>
                    {:else if filteredRepos.length === 0}
                        <div class="px-4 py-6 text-center text-sm text-muted-foreground">No repositories found.</div>
                    {:else}
                        {#each filteredRepos as repo (repo.id)}
                            <button
                                    onclick={() => selectRepo(repo)}
                                    class="w-full px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left
                                    {selectedRepo?.fullName === repo.full_name ? 'bg-primary/5' : ''}"
                            >
                                <LockIcon class="size-3.5 shrink-0 {repo.private ? 'text-muted-foreground' : 'text-muted-foreground/30'}" />
                                <span class="flex-1 min-w-0">
                                    <span class="text-sm font-medium truncate block">{repo.full_name}</span>
                                    {#if repo.description}
                                        <span class="text-xs text-muted-foreground truncate block">{repo.description}</span>
                                    {/if}
                                </span>
                                <span class="flex items-center gap-2 shrink-0">
                                    <span class="flex items-center gap-1 text-xs text-muted-foreground">
                                        <GitBranchIcon class="size-3" />{repo.default_branch}
                                    </span>
                                    {#if selectedRepo?.fullName === repo.full_name}
                                        <CheckIcon class="size-4 text-primary" />
                                    {/if}
                                </span>
                            </button>
                        {/each}
                    {/if}
                </div>
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={() => (step = 1)}>
                    <ChevronLeftIcon class="size-3.5 mr-1.5" /> Back
                </Button>
                <Button onclick={() => (step = 3)} disabled={!selectedRepo}>
                    Continue <ChevronRightIcon class="size-3.5 ml-1.5" />
                </Button>
            </div>

            <!-- Step 3: Branch -->
        {:else if step === 3}
            <div class="bg-card border rounded-xl p-6 space-y-3">
                <div>
                    <h2 class="font-semibold">Select Branch</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Choose the branch to build and deploy from.</p>
                </div>

                {#if selectedRepo}
                    <div class="bg-muted/50 rounded-xl px-4 py-3 flex items-center gap-3">
                        <BookOpenIcon class="size-4 text-muted-foreground shrink-0" />
                        <span class="flex-1 min-w-0">
                            <span class="text-sm font-medium block">{selectedRepo.fullName}</span>
                            <span class="text-xs text-muted-foreground font-mono truncate block">{selectedRepo.cloneUrl}</span>
                        </span>
                        {#if selectedRepo.private}
                            <Badge variant="secondary" class="text-xs">Private</Badge>
                        {/if}
                    </div>
                {/if}

                <div class="relative">
                    <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input class="pl-9 text-sm" placeholder="Search branches..." bind:value={branchSearch} />
                </div>

                <div class="border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                    {#if branchesQuery.isPending}
                        {#each Array(4) as _, i (i)}
                            <div class="px-4 py-3 border-b flex items-center gap-3 animate-pulse">
                                <div class="size-3 bg-muted rounded"></div>
                                <div class="h-3.5 bg-muted rounded w-32"></div>
                            </div>
                        {/each}
                    {:else if filteredBranches.length === 0}
                        <div class="px-4 py-6 text-center text-sm text-muted-foreground">
                            {branchSearch ? "No matching branches." : "No branches found."}
                        </div>
                    {:else}
                        {#each filteredBranches as branch (branch.name)}
                            <button
                                    onclick={() => (selectedBranch = branch.name)}
                                    class="w-full px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left
                                    {selectedBranch === branch.name ? 'bg-primary/5' : ''}"
                            >
                                <GitBranchIcon class="size-3.5 text-muted-foreground shrink-0" />
                                <span class="text-sm font-medium flex-1">{branch.name}</span>
                                {#if branch.name === selectedRepo?.defaultBranch}
                                    <Badge variant="secondary" class="text-xs">default</Badge>
                                {/if}
                                {#if branch.protected}
                                    <LockIcon class="size-3 text-muted-foreground" />
                                {/if}
                                {#if selectedBranch === branch.name}
                                    <CheckIcon class="size-4 text-primary" />
                                {/if}
                            </button>
                        {/each}
                    {/if}
                </div>
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={() => (step = 2)}>
                    <ChevronLeftIcon class="size-3.5 mr-1.5" /> Back
                </Button>
                {#if hasWorkers}
                    <Button onclick={() => (step = 4)} disabled={!selectedBranch}>
                        Continue <ChevronRightIcon class="size-3.5 ml-1.5" />
                    </Button>
                {:else}
                    <Button onclick={handleDeploy} disabled={!selectedBranch}>
                        <RocketIcon class="size-3.5 mr-1.5" /> Continue to Deploy
                    </Button>
                {/if}
            </div>

            <!-- Step 4: Server (only when workers connected) -->
        {:else if step === 4}
            <div class="bg-card border rounded-xl p-6 space-y-3">
                <div>
                    <h2 class="font-semibold">Select Deploy Target</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Choose which server to deploy this container on.</p>
                </div>

                <!-- Plane (default) -->
                <button
                        onclick={() => (workerId = null)}
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                        {workerId === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
                >
                    <span class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <ServerIcon class="size-4 text-muted-foreground" />
                    </span>
                    <span class="flex-1 min-w-0">
                        <span class="text-sm font-medium block">Plane <span class="text-xs text-muted-foreground font-normal">(this server)</span></span>
                        <span class="text-xs text-muted-foreground block">Default — runs locally on the Plane node</span>
                    </span>
                    {#if workerId === null}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
                </button>

                <!-- Workers -->
                {#each connectedWorkers as w (w.id)}
                    <button
                            onclick={() => (workerId = w.id)}
                            class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                            {workerId === w.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
                    >
                        <span class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <ServerIcon class="size-4 text-muted-foreground" />
                        </span>
                        <span class="flex-1 min-w-0">
                            <span class="text-sm font-medium block">{workerLabel(w)}</span>
                            <span class="text-xs text-muted-foreground font-mono block">
                                {w.last_seen_ip ?? ""}{w.os ? ` · ${w.os}/${w.arch}` : ""}
                                {#if w.cpu_percent > 0} · CPU {w.cpu_percent.toFixed(0)}%{/if}
                            </span>
                        </span>
                        {#if workerId === w.id}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
                    </button>
                {/each}
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={() => (step = 3)}>
                    <ChevronLeftIcon class="size-3.5 mr-1.5" /> Back
                </Button>
                <Button onclick={handleDeploy} disabled={!selectedBranch}>
                    <RocketIcon class="size-3.5 mr-1.5" /> Continue to Deploy
                </Button>
            </div>
        {/if}

    </div>
</div>