<script lang="ts">
import { SiBitbucket, SiGitea, SiGithub, SiGitlab } from "@icons-pack/svelte-simple-icons";
import {
	BoxIcon,
	CheckIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	CircleIcon,
	CodeIcon,
	FileCodeIcon,
	GitBranchIcon,
	GlobeIcon,
	LayersIcon,
	LockIcon,
	RocketIcon,
	SearchIcon,
	ServerIcon,
} from "@lucide/svelte";
import { createQuery, useQueryClient } from "@tanstack/svelte-query";
import {type Component, getContext} from "svelte";
import { goto } from "$app/navigation";
import { agentApi } from "$lib/api/v1/agent";
import { gitApi } from "$lib/api/v1/git";
import { servicesApi } from "$lib/api/v1/manifest";
import type { GitBranch, GitRepository } from "$lib/api/v1/types/git.js";
import { providerMeta } from "$lib/api/v1/types/git.js";
import type { ServiceCreateRequest } from "$lib/api/v1/types/manifest.js";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { auth } from "$lib/stores/auth.svelte.js";
import { dashboardQueries} from "$lib/queries/dashboard.js";
import type {DashboardOverview} from "$lib/api";

const qc = useQueryClient();
const ctx = getContext<{ data: DashboardOverview | undefined }>("dashboard");

// ── Source types ──────────────────────────────────────────────────────────────
type SourceType = "image" | "git" | "dockerfile" | "compose";

const sources: { type: SourceType; label: string; desc: string; icon: Component }[] = [
	{
		type: "image",
		label: "Container Image",
		desc: "Deploy any public or private OCI image",
		icon: BoxIcon,
	},
	{
		type: "git",
		label: "Git Repository",
		desc: "Clone from GitHub, GitLab, Gitea or Bitbucket",
		icon: GitBranchIcon,
	},
	{
		type: "dockerfile",
		label: "Dockerfile",
		desc: "Build from an inline Dockerfile",
		icon: FileCodeIcon,
	},
	{
		type: "compose",
		label: "Docker Compose",
		desc: "Deploy a multi-service Compose stack",
		icon: LayersIcon,
	},
];

// ── State ─────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4 | 5;
let step = $state<Step>(1);
let sourceType = $state<SourceType | null>(null);

// Source-specific
let image = $state("");
let gitIntegrationId = $state<string | null>(null);
let gitRepo = $state<{
	owner: string;
	name: string;
	fullName: string;
	defaultBranch: string;
	cloneUrl: string;
	private: boolean;
} | null>(null);
let gitBranch = $state("");
let repoSearch = $state("");
let branchSearch = $state("");
let selectedOwner = $state("all");
let dockerfile = $state(
	"FROM nginx:alpine\nRUN echo '<h1>Hello from Tidefly!</h1>' > /usr/share/nginx/html/index.html\nEXPOSE 80"
);
let compose = $state(
	'manifest:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"\n    restart: unless-stopped'
);

// Config (step 3)
let projectId = $state("");
let serviceName = $state("");
let expose = $state(false);
let port = $state("");
let domain = $state("");

// Server (step 4)
let workerId = $state<string | null>(null);

// Deploy
let deploying = $state(false);
let deployError = $state<string | null>(null);
let deploySuccess = $state(false);

// ── Queries ───────────────────────────────────────────────────────────────────
const dashboardQuery = createQuery(() => ({ ...dashboardQueries.get(), enabled: !!auth.user }));
const integrationsQuery = createQuery(() => ({
	queryKey: ["git-integrations"],
	queryFn: () => gitApi.list(),
}));
const reposQuery = createQuery(() => ({
	queryKey: ["git-repos", gitIntegrationId],
	queryFn: () => gitApi.listRepositories(gitIntegrationId ?? ""),
	enabled: !!gitIntegrationId && sourceType === "git" && step === 2,
	staleTime: 60_000,
}));
const branchesQuery = createQuery(() => ({
	queryKey: ["git-branches", gitIntegrationId, gitRepo?.owner, gitRepo?.name],
	queryFn: () =>
		gitApi.listBranches(gitIntegrationId ?? "", gitRepo?.owner ?? "", gitRepo?.name ?? ""),
	enabled: !!gitIntegrationId && !!gitRepo && sourceType === "git" && step === 2,
	staleTime: 30_000,
}));
const workersQuery = createQuery(() => ({
	queryKey: ["workers"],
	queryFn: () => agentApi.listWorkers(),
	staleTime: 30_000,
}));

// ── Derived ───────────────────────────────────────────────────────────────────
const isAdmin = $derived(auth.user?.role === "admin");
const visibleProjects = $derived(
    isAdmin
        ? (ctx.data?.projects ?? [])
        : (ctx.data?.projects ?? []).filter((p) => auth.projectIds.includes(p.id))
);
const connectedWorkers = $derived(
	(workersQuery.data ?? []).filter((w) => w.status === "connected")
);
const hasWorkers = $derived(connectedWorkers.length > 0);
const owners = $derived(
	[...new Set((reposQuery.data ?? []).map((r: GitRepository) => r.full_name.split("/")[0]))].sort()
);
const filteredRepos = $derived(
	(reposQuery.data ?? []).filter((r: GitRepository) => {
		const matchOwner = selectedOwner === "all" || r.full_name.startsWith(`${selectedOwner}/`);
		const matchSearch = !repoSearch || r.full_name.toLowerCase().includes(repoSearch.toLowerCase());
		return matchOwner && matchSearch;
	})
);
const filteredBranches = $derived(
	branchSearch
		? (branchesQuery.data ?? []).filter((b: GitBranch) =>
				b.name.toLowerCase().includes(branchSearch.toLowerCase())
			)
		: (branchesQuery.data ?? [])
);

const configValid = $derived(
	projectId.length > 0 &&
		serviceName.trim().length > 0 &&
		(!expose || (port !== "" && port !== "0" && parseInt(port, 10) > 0))
);

// ── Auto-fill name ────────────────────────────────────────────────────────────
$effect(() => {
	if (sourceType === "git" && gitRepo && !serviceName) {
		serviceName = gitRepo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
	}
	if (sourceType === "image" && image && !serviceName) {
		const base = image.split(":")[0].split("/").pop() ?? "";
		serviceName = base.toLowerCase().replace(/[^a-z0-9-]/g, "-");
	}
});

// ── Actions ───────────────────────────────────────────────────────────────────
function selectSource(type: SourceType) {
	sourceType = type;
	step = 2;
}

function selectIntegration(id: string) {
	gitIntegrationId = id;
	gitRepo = null;
	gitBranch = "";
	repoSearch = "";
	branchSearch = "";
	selectedOwner = "all";
	serviceName = "";
}

function selectRepo(repo: GitRepository) {
	gitRepo = {
		owner: repo.full_name.split("/")[0],
		name: repo.name,
		fullName: repo.full_name,
		defaultBranch: repo.default_branch,
		cloneUrl: repo.clone_url,
		private: repo.private,
	};
	gitBranch = repo.default_branch;
	if (!serviceName) serviceName = repo.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

async function handleDeploy() {
	if (deploying) return;
	deploying = true;
	deployError = null;

	try {
		const payload: ServiceCreateRequest = {
			name: serviceName.trim(),
			project_id: projectId,
			expose,
			port: expose && port ? parseInt(port, 10) : undefined,
			domain: domain.trim() || undefined,
		};

		if (sourceType === "image") payload.image = image.trim();
		else if (sourceType === "git") {
			payload.git_url = gitRepo?.cloneUrl;
			payload.branch = gitBranch;
			payload.git_integration_id = gitIntegrationId ?? undefined;
		} else if (sourceType === "dockerfile") payload.dockerfile = dockerfile.trim();
		else if (sourceType === "compose") {
			payload.compose = compose.trim();
			payload.stack_name = serviceName.trim();
		}

		if (workerId) payload.worker_id = workerId;

		await servicesApi.create(payload);
		deploySuccess = true;
		step = 5;
		await qc.invalidateQueries({ queryKey: ["manifest"] });
		await qc.invalidateQueries({ queryKey: ["containers"] });
	} catch (e) {
		deployError = String(e);
		deploying = false;
	}
}

function reset() {
	step = 1;
	sourceType = null;
	image = "";
	gitIntegrationId = null;
	gitRepo = null;
	gitBranch = "";
	repoSearch = "";
	branchSearch = "";
	selectedOwner = "all";
	projectId = "";
	serviceName = "";
	expose = false;
	port = "";
	domain = "";
	workerId = null;
	deploying = false;
	deployError = null;
	deploySuccess = false;
}

function backToStep2() {
	step = 2;
}
function backToStep1() {
	step = 1;
	sourceType = null;
	gitIntegrationId = null;
	gitRepo = null;
}

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
</script>

<div class="min-h-[calc(100vh-8rem)] flex flex-col items-center pt-12 pb-16 px-4">
    <div class="w-full max-w-2xl space-y-6">

        <!-- Header -->
        <div>
            <h1 class="text-xl font-semibold">Deploy a Service</h1>
            <p class="text-sm text-muted-foreground mt-1">Choose a source and Tidefly handles the rest.</p>
        </div>

        <!-- ── STEP 1: Source ── -->
        {#if step === 1}
            <div class="grid gap-3">
                {#each sources as src (src.type)}
                    {@const Icon = src.icon}
                    <button
                            onclick={() => selectSource(src.type)}
                            class="bg-card border rounded-xl p-4 text-left hover:border-primary/60 hover:bg-muted/30 transition-all flex items-center gap-4 group w-full"
                    >
						<span class="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
							<Icon class="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
						</span>
                        <span class="flex-1 min-w-0">
							<span class="block text-sm font-medium">{src.label}</span>
							<span class="block text-xs text-muted-foreground mt-0.5">{src.desc}</span>
						</span>
                        <ChevronRightIcon class="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </button>
                {/each}
            </div>

            <!-- ── STEP 2: Image ── -->
        {:else if step === 2 && sourceType === "image"}
            <div class="bg-card border rounded-xl p-6 space-y-4">
                <div>
                    <h2 class="font-semibold">Container Image</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Enter any OCI image reference.</p>
                </div>
                <div class="space-y-1.5">
                    <Label for="img">Image <span class="text-destructive">*</span></Label>
                    <Input id="img" bind:value={image} placeholder="nginx:alpine or ghcr.io/myorg/myapp:latest" class="font-mono text-sm" />
                    <p class="text-xs text-muted-foreground">Docker Hub, GHCR, ECR — any registry works</p>
                </div>
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={backToStep1}><ChevronLeftIcon class="size-3.5 mr-1.5" /> Back</Button>
                <Button onclick={() => (step = 3)} disabled={!image.trim()}>Continue <ChevronRightIcon class="size-3.5 ml-1.5" /></Button>
            </div>

            <!-- ── STEP 2: Git ── -->
        {:else if step === 2 && sourceType === "git"}
            <div class="space-y-4">
                <!-- Integration picker -->
                {#if !gitIntegrationId}
                    <div class="bg-card border rounded-xl p-6 space-y-3">
                        <h2 class="font-semibold">Select Git Integration</h2>
                        {#if integrationsQuery.isPending}
                            {#each Array(2) as _, i (i)}<div class="h-14 bg-muted rounded-xl animate-pulse"></div>{/each}
                        {:else if (integrationsQuery.data ?? []).length === 0}
                            <div class="text-center py-6">
                                <p class="text-sm text-muted-foreground">No Git integrations connected.</p>
                                <a href="/dashboard/git/new" class="text-sm text-primary hover:underline mt-1 block">Connect a provider →</a>
                            </div>
                        {:else}
                            {#each (integrationsQuery.data ?? []) as int (int.id)}
                                {@const Icon = providerIcon(int.provider)}
                                {@const meta = providerMeta[int.provider as keyof typeof providerMeta]}
                                <button onclick={() => selectIntegration(int.id)}
                                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all border-border hover:border-primary/40 hover:bg-muted/50">
									<span class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
										<Icon class="size-4" style="color: {meta?.color ?? '#888'}" />
									</span>
                                    <span class="flex-1 min-w-0">
										<span class="text-sm font-medium block">{int.name}</span>
										<span class="text-xs text-muted-foreground capitalize">{int.provider}</span>
									</span>
                                    <ChevronRightIcon class="size-4 text-muted-foreground" />
                                </button>
                            {/each}
                        {/if}
                    </div>
                    <!-- Repo picker -->
                {:else if !gitRepo}
                    <div class="bg-card border rounded-xl p-6 space-y-3">
                        <div class="flex items-center justify-between">
                            <h2 class="font-semibold">Select Repository</h2>
                            <button onclick={() => (gitIntegrationId = null)} class="text-xs text-muted-foreground hover:text-foreground">← Change</button>
                        </div>
                        {#if owners.length > 1}
                            <div class="flex gap-1.5 flex-wrap">
                                {#each ["all", ...owners] as owner (owner)}
                                    <button onclick={() => (selectedOwner = owner)}
                                            class="px-2.5 py-1 rounded-md text-xs border transition-colors {selectedOwner === owner ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/50'}">
                                        {owner === "all" ? "All" : owner}
                                    </button>
                                {/each}
                            </div>
                        {/if}
                        <div class="relative">
                            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input class="pl-9 text-sm" placeholder="Search repositories…" bind:value={repoSearch} />
                        </div>
                        <div class="border rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                            {#if reposQuery.isPending}
                                {#each Array(4) as _, i (i)}
                                    <div class="px-4 py-3 border-b flex items-center gap-3 animate-pulse">
                                        <div class="size-3.5 bg-muted rounded-full"></div>
                                        <div class="h-3.5 bg-muted rounded w-40"></div>
                                    </div>
                                {/each}
                            {:else if filteredRepos.length === 0}
                                <div class="px-4 py-6 text-center text-sm text-muted-foreground">No repositories found.</div>
                            {:else}
                                {#each filteredRepos as repo (repo.full_name)}
                                    <button onclick={() => selectRepo(repo)}
                                            class="w-full px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left">
                                        {#if repo.private}<LockIcon class="size-3 text-muted-foreground shrink-0" />{:else}<CodeIcon class="size-3 text-muted-foreground shrink-0" />{/if}
                                        <span class="text-sm flex-1 truncate">{repo.full_name}</span>
                                        <span class="text-xs text-muted-foreground font-mono">{repo.default_branch}</span>
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </div>
                    <!-- Branch picker -->
                {:else}
                    <div class="bg-card border rounded-xl p-6 space-y-3">
                        <div class="flex items-center justify-between">
                            <h2 class="font-semibold">Select Branch</h2>
                            <button onclick={() => { gitRepo = null; gitBranch = ""; }} class="text-xs text-muted-foreground hover:text-foreground">← Change repo</button>
                        </div>
                        <div class="flex items-center gap-2 px-3 py-2.5 bg-muted/50 border rounded-lg text-sm">
                            <CodeIcon class="size-3.5 text-muted-foreground shrink-0" />
                            <span class="font-medium">{gitRepo.fullName}</span>
                        </div>
                        <div class="relative">
                            <SearchIcon class="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input class="pl-9 text-sm" placeholder="Search branches…" bind:value={branchSearch} />
                        </div>
                        <div class="border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                            {#if branchesQuery.isPending}
                                {#each Array(3) as _, i (i)}
                                    <div class="px-4 py-3 border-b animate-pulse"><div class="h-3.5 bg-muted rounded w-32"></div></div>
                                {/each}
                            {:else if filteredBranches.length === 0}
                                <div class="px-4 py-6 text-center text-sm text-muted-foreground">No branches found.</div>
                            {:else}
                                {#each filteredBranches as branch (branch.name)}
                                    <button onclick={() => (gitBranch = branch.name)}
                                            class="w-full px-4 py-3 border-b last:border-0 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left {gitBranch === branch.name ? 'bg-primary/5' : ''}">
                                        <GitBranchIcon class="size-3.5 text-muted-foreground shrink-0" />
                                        <span class="text-sm font-medium flex-1">{branch.name}</span>
                                        {#if branch.name === gitRepo.defaultBranch}<span class="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">default</span>{/if}
                                        {#if branch.protected}<LockIcon class="size-3 text-muted-foreground" />{/if}
                                        {#if gitBranch === branch.name}<CheckIcon class="size-4 text-primary" />{/if}
                                    </button>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={backToStep1}><ChevronLeftIcon class="size-3.5 mr-1.5" /> Back</Button>
                <Button onclick={() => (step = 3)} disabled={!gitRepo || !gitBranch}>Continue <ChevronRightIcon class="size-3.5 ml-1.5" /></Button>
            </div>

            <!-- ── STEP 2: Dockerfile ── -->
        {:else if step === 2 && sourceType === "dockerfile"}
            <div class="bg-card border rounded-xl p-6 space-y-4">
                <div>
                    <h2 class="font-semibold">Dockerfile</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Paste or write your Dockerfile. Tidefly builds and deploys it.</p>
                </div>
                <textarea bind:value={dockerfile} rows={16} spellcheck="false"
                          class="border-input bg-black/80 text-green-400 font-mono w-full rounded-xl border px-4 py-3 text-xs shadow-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring">
				</textarea>
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={backToStep1}><ChevronLeftIcon class="size-3.5 mr-1.5" /> Back</Button>
                <Button onclick={() => (step = 3)} disabled={!dockerfile.trim()}>Continue <ChevronRightIcon class="size-3.5 ml-1.5" /></Button>
            </div>

            <!-- ── STEP 2: Compose ── -->
        {:else if step === 2 && sourceType === "compose"}
            <div class="bg-card border rounded-xl p-6 space-y-4">
                <div>
                    <h2 class="font-semibold">docker-compose.yml</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Paste your Compose file. Each service becomes a Tidefly service.</p>
                </div>
                <textarea bind:value={compose} rows={16} spellcheck="false"
                          class="border-input bg-black/80 text-green-400 font-mono w-full rounded-xl border px-4 py-3 text-xs shadow-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring">
				</textarea>
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={backToStep1}><ChevronLeftIcon class="size-3.5 mr-1.5" /> Back</Button>
                <Button onclick={() => (step = 3)} disabled={!compose.trim()}>Continue <ChevronRightIcon class="size-3.5 ml-1.5" /></Button>
            </div>

            <!-- ── STEP 3: Config ── -->
        {:else if step === 3}
            <div class="bg-card border rounded-xl p-6 space-y-5">
                <div>
                    <h2 class="font-semibold">Service Configuration</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Name, project and network access.</p>
                </div>

                <!-- Project -->
                <div class="space-y-2">
                    <Label>Project <span class="text-destructive">*</span></Label>
                    {#if dashboardQuery.isPending}
                        {#each Array(2) as _, i (i)}<div class="h-12 bg-muted rounded-xl animate-pulse"></div>{/each}
                    {:else if visibleProjects.length === 0}
                        <p class="text-sm text-muted-foreground">No projects. <a href="/dashboard/projects/new" class="text-primary hover:underline">Create one →</a></p>
                    {:else}
                        <div class="space-y-2">
                            {#each visibleProjects as p (p.id)}
                                <button onclick={() => (projectId = p.id)}
                                        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all {projectId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}">
                                    <CircleIcon class="size-3 fill-current shrink-0" style="color: {p.color}" />
                                    <span class="flex-1 min-w-0">
										<span class="text-sm font-medium block">{p.name}</span>
										<span class="text-xs text-muted-foreground font-mono">{p.network_name}</span>
									</span>
                                    {#if projectId === p.id}<CheckIcon class="size-4 text-primary shrink-0" />{/if}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Name -->
                <div class="space-y-1.5">
                    <Label for="svc-name">Service Name <span class="text-destructive">*</span></Label>
                    <Input id="svc-name" bind:value={serviceName} placeholder="my-service" />
                    <p class="text-xs text-muted-foreground">Lowercase letters, numbers and hyphens only</p>
                </div>

                <!-- Expose -->
                <button onclick={() => { expose = !expose; if (!expose) { port = ""; domain = ""; } }}
                        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all {expose ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}">
					<span class="size-8 rounded-lg flex items-center justify-center shrink-0 {expose ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
						<GlobeIcon class="size-4" />
					</span>
                    <span class="flex-1">
						<span class="text-sm font-medium block">Expose via Caddy</span>
						<span class="text-xs text-muted-foreground">Create a public HTTPS route for this service</span>
					</span>
                    {#if expose}<CheckIcon class="size-4 text-primary shrink-0" />{/if}
                </button>
                {#if expose}
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-1.5">
                            <Label for="svc-port">Container Port <span class="text-destructive">*</span></Label>
                            <Input id="svc-port" bind:value={port} placeholder="8080" type="number" />
                            <p class="text-xs text-muted-foreground">Port your app listens on</p>
                        </div>
                        <div class="space-y-1.5">
                            <Label for="svc-domain">Custom Domain <span class="text-muted-foreground text-xs">(optional)</span></Label>
                            <Input id="svc-domain" bind:value={domain} placeholder="myapp.example.com" />
                        </div>
                    </div>
                {/if}
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={backToStep2}><ChevronLeftIcon class="size-3.5 mr-1.5" /> Back</Button>
                {#if hasWorkers}
                    <Button onclick={() => (step = 4)} disabled={!configValid}>Continue <ChevronRightIcon class="size-3.5 ml-1.5" /></Button>
                {:else}
                    <Button onclick={handleDeploy} disabled={!configValid || deploying}>
                        {#if deploying}<span class="animate-pulse">Deploying…</span>{:else}<RocketIcon class="size-3.5 mr-1.5" /> Deploy{/if}
                    </Button>
                {/if}
            </div>
            {#if deployError}
                <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">{deployError}</div>
            {/if}

            <!-- ── STEP 4: Server ── -->
        {:else if step === 4}
            <div class="bg-card border rounded-xl p-6 space-y-3">
                <div>
                    <h2 class="font-semibold">Deploy Target</h2>
                    <p class="text-sm text-muted-foreground mt-0.5">Choose which server to deploy this service on.</p>
                </div>
                <button onclick={() => (workerId = null)}
                        class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all {workerId === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}">
                    <span class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><ServerIcon class="size-4 text-muted-foreground" /></span>
                    <span class="flex-1 min-w-0">
						<span class="text-sm font-medium block">Plane <span class="text-xs text-muted-foreground font-normal">(this server)</span></span>
						<span class="text-xs text-muted-foreground">Default — runs locally on the Plane node</span>
					</span>
                    {#if workerId === null}<CheckIcon class="size-4 text-primary shrink-0" />{/if}
                </button>
                {#each connectedWorkers as w (w.id)}
                    <button onclick={() => (workerId = w.id)}
                            class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all {workerId === w.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}">
                        <span class="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><ServerIcon class="size-4 text-muted-foreground" /></span>
                        <span class="flex-1 min-w-0">
							<span class="text-sm font-medium block">{w.name}</span>
							<span class="text-xs text-muted-foreground font-mono">{w.last_seen_ip ?? ""}{w.os ? ` · ${w.os}/${w.arch}` : ""}</span>
						</span>
                        {#if workerId === w.id}<CheckIcon class="size-4 text-primary shrink-0" />{/if}
                    </button>
                {/each}
            </div>
            <div class="flex justify-between">
                <Button variant="outline" onclick={() => (step = 3)}><ChevronLeftIcon class="size-3.5 mr-1.5" /> Back</Button>
                <Button onclick={handleDeploy} disabled={deploying}>
                    {#if deploying}<span class="animate-pulse">Deploying…</span>{:else}<RocketIcon class="size-3.5 mr-1.5" /> Deploy{/if}
                </Button>
            </div>
            {#if deployError}
                <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">{deployError}</div>
            {/if}

            <!-- ── STEP 5: Success ── -->
        {:else if step === 5}
            <div class="bg-card border rounded-xl p-10 text-center space-y-4">
                <div class="size-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                    <RocketIcon class="size-7 text-green-500" />
                </div>
                <div>
                    <h2 class="font-semibold text-lg">Service deployed</h2>
                    <p class="text-sm text-muted-foreground mt-1">
                        <strong>{serviceName}</strong> is being started. It will be ready in a moment.
                    </p>
                </div>
                <div class="flex gap-3 justify-center flex-wrap">
                    <Button variant="outline" onclick={reset}>Deploy another</Button>
                    <Button onclick={() => goto("/dashboard/containers")}>
                        <RocketIcon class="size-3.5 mr-1.5" /> View services
                    </Button>
                </div>
            </div>
        {/if}

    </div>
</div>