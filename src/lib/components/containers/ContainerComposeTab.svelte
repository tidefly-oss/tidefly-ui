<script lang="ts">
import {
	ArrowLeftIcon,
	ArrowRightIcon,
	CheckIcon,
	CircleCheckBig,
	CircleIcon,
	CircleX,
	GlobeIcon,
	Loader,
	RocketIcon,
	ServerIcon,
	TerminalIcon,
} from "@lucide/svelte";
import { createQuery, useQueryClient } from "@tanstack/svelte-query";
import { goto } from "$app/navigation";
import { agentApi, type WorkerNode } from "$lib/api/v1/agent/index.js";
import { containersApi } from "$lib/api/v1/containers";
import { Button } from "$lib/components/ui/button/index.js";
import { Input } from "$lib/components/ui/input/index.js";
import { Label } from "$lib/components/ui/label/index.js";
import { projectQueries } from "$lib/queries/projects.js";
import { auth } from "$lib/stores/auth.svelte";

const qc = useQueryClient();

interface Props {
	initialName?: string;
	initialGitUrl?: string;
	initialBranch?: string;
}

let { initialName = "", initialGitUrl = "", initialBranch = "" }: Props = $props();

const projectsQuery = createQuery(() => ({
	...projectQueries.list(),
	enabled: !!auth.user,
}));

const workersQuery = createQuery(() => ({
	queryKey: ["workers"],
	queryFn: () => agentApi.listWorkers(),
	staleTime: 30_000,
}));

const isAdmin = $derived(auth.user?.role === "admin");
const visibleProjects = $derived(
	isAdmin
		? (projectsQuery.data ?? [])
		: (projectsQuery.data ?? []).filter((p) => auth.projectIds.includes(p.id))
);
const connectedWorkers = $derived(
	(workersQuery.data ?? []).filter((w: WorkerNode) => w.status === "connected")
);

type Step = 1 | 2 | 3 | 4;
let step = $state<Step>(1);

let projectId = $state("");
let workerId = $state<string | null>(null);
let name = $state("");
let compose = $state("");
let expose = $state(false);

$effect(() => {
	if (initialName && !name) name = initialName;
});

$effect(() => {
	if (compose) return;
	compose = `version: "3.8"\nservices:\n  app:\n    image: nginx:alpine\n    ports:\n      - "8080:80"\n    restart: unless-stopped`;
});

let building = $state(false);
let logs = $state<{ type: string; message: string }[]>([]);
let status = $state<"idle" | "building" | "success" | "error">("idle");

function selectProject(id: string) {
	projectId = id;
}

const step1Valid = $derived(projectId.length > 0);
const step2Valid = $derived(name.trim().length > 0);
const step3Valid = $derived(compose.trim().length > 0);

async function handleBuild() {
	if (building) return;
	logs = [];
	status = "building";
	building = true;
	step = 4;

	try {
		const result = await containersApi.deployCompose({
			compose: compose.trim(),
			stack_name: name.trim(),
			project_id: projectId,
			expose,
		});

		logs = result.containers.map((c) => ({ type: "done", message: `✓ ${c}` }));
		if (result.urls) {
			for (const [svc, url] of Object.entries(result.urls)) {
				logs = [...logs, { type: "done", message: `🌐 ${svc}: ${url}` }];
			}
		}

		status = "success";
		building = false;
		await qc.invalidateQueries({ queryKey: ["containers"] });
	} catch (e) {
		logs = [{ type: "error", message: String(e) }];
		status = "error";
		building = false;
	}
}

const steps = ["Project", "Config", "Compose", "Deploy"];

function workerLabel(w: WorkerNode) {
	return w.name.length > 28 ? `${w.name.slice(0, 24)}…` : w.name;
}
</script>

<div class="max-w-2xl mx-auto space-y-6">
    <!-- Step indicator -->
    <div class="flex items-center gap-0">
        {#each steps as label, i (i)}
            {@const n = (i + 1) as Step}
            {@const isActive = step === n}
            {@const isDone = step > n}
            <div class="flex items-center gap-0 flex-1 last:flex-none">
                <button
                        onclick={() => { if (isDone) step = n; }}
                        class="flex items-center gap-2 shrink-0 {isDone ? 'cursor-pointer' : 'cursor-default'}"
                >
                    <span class="size-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all
                        {isDone ? 'bg-primary border-primary text-primary-foreground' : isActive ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'}">
                        {#if isDone}<CheckIcon class="size-3.5"/>{:else}{n}{/if}
                    </span>
                    <span class="text-xs font-medium hidden sm:block {isActive ? 'text-foreground' : isDone ? 'text-primary' : 'text-muted-foreground'}">
                        {label}
                    </span>
                </button>
                {#if i < steps.length - 1}
                    <div class="flex-1 h-px mx-3 {step > n ? 'bg-primary' : 'bg-border'}"></div>
                {/if}
            </div>
        {/each}
    </div>

    <!-- Step 1: Project -->
    {#if step === 1}
        <div class="bg-card border rounded-xl p-6 space-y-4">
            <div>
                <h2 class="font-semibold">Select a Project</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Your stack will be deployed into this project's network.</p>
            </div>

            {#if projectsQuery.isPending}
                <div class="space-y-2">
                    {#each Array(2) as _, i (i)}
                        <div class="h-14 bg-muted rounded-xl animate-pulse"></div>
                    {/each}
                </div>
            {:else if visibleProjects.length === 0}
                <div class="text-center py-8">
                    {#if isAdmin}
                        <p class="text-sm text-muted-foreground">No projects yet.</p>
                        <a href="/dashboard/projects/new" class="text-sm text-primary hover:underline mt-1 block">Create your first project →</a>
                    {:else}
                        <p class="text-sm text-muted-foreground">You have no projects assigned. Contact an admin.</p>
                    {/if}
                </div>
            {:else}
                <div class="space-y-2">
                    {#each visibleProjects as p (p.id)}
                        <button
                                onclick={() => selectProject(p.id)}
                                class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                                {projectId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
                        >
                            <CircleIcon class="size-3 fill-current shrink-0" style="color: {p.color}"/>
                            <span class="flex-1 min-w-0">
                                <span class="text-sm font-medium block">{p.name}</span>
                                <span class="text-xs text-muted-foreground font-mono mt-0.5 block">{p.network_name}</span>
                            </span>
                            {#if projectId === p.id}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="flex justify-end">
            <Button onclick={() => (step = 2)} disabled={!step1Valid}>
                Continue <ArrowRightIcon class="size-4 ml-1.5"/>
            </Button>
        </div>

        <!-- Step 2: Config -->
    {:else if step === 2}
        <div class="bg-card border rounded-xl p-6 space-y-4">
            <div>
                <h2 class="font-semibold">Stack Configuration</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Basic settings for your Compose stack.</p>
            </div>

            <div class="space-y-1.5">
                <Label for="co-name">Stack Name <span class="text-destructive">*</span></Label>
                <Input id="co-name" bind:value={name} placeholder="my-stack"/>
                <p class="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens</p>
            </div>

            <!-- Expose toggle -->
            <button
                    onclick={() => expose = !expose}
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                    {expose ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}"
            >
                <span class="size-8 rounded-lg flex items-center justify-center shrink-0
                    {expose ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}">
                    <GlobeIcon class="size-4"/>
                </span>
                <span class="flex-1">
                    <span class="text-sm font-medium block">Expose via Caddy</span>
                    <span class="text-xs text-muted-foreground">Automatically create public HTTPS routes for all services</span>
                </span>
                {#if expose}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
            </button>

            <!-- Worker selection -->
            {#if connectedWorkers.length > 0}
                <div class="space-y-2 pt-1">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deploy Target</p>

                    <button
                            onclick={() => (workerId = null)}
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                            {workerId === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
                    >
                        <span class="size-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                            <ServerIcon class="size-4 text-muted-foreground"/>
                        </span>
                        <span class="flex-1 min-w-0">
                            <span class="text-sm font-medium block">Plane (this server)</span>
                            <span class="text-xs text-muted-foreground">Default — runs locally on the Plane node</span>
                        </span>
                        {#if workerId === null}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
                    </button>

                    {#each connectedWorkers as w (w.id)}
                        <button
                                onclick={() => (workerId = w.id)}
                                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all
                                {workerId === w.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
                        >
                            <span class="size-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                                <ServerIcon class="size-4 text-muted-foreground"/>
                            </span>
                            <span class="flex-1 min-w-0">
                                <span class="text-sm font-medium block">{workerLabel(w)}</span>
                                <span class="text-xs text-muted-foreground font-mono">
                                    {w.last_seen_ip ?? ""}{w.os ? ` · ${w.os}/${w.arch}` : ""}
                                    {#if w.cpu_percent > 0} · CPU {w.cpu_percent.toFixed(0)}%{/if}
                                </span>
                            </span>
                            {#if workerId === w.id}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <div class="flex justify-between">
            <Button variant="outline" onclick={() => (step = 1)}>
                <ArrowLeftIcon class="size-4 mr-1.5"/> Back
            </Button>
            <Button onclick={() => (step = 3)} disabled={!step2Valid}>
                Continue <ArrowRightIcon class="size-4 ml-1.5"/>
            </Button>
        </div>

        <!-- Step 3: Compose -->
    {:else if step === 3}
        <div class="bg-card border rounded-xl p-6 space-y-4">
            <div>
                <h2 class="font-semibold">docker-compose.yml</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Paste your docker-compose.yml content.</p>
            </div>
            <textarea
                    bind:value={compose}
                    rows={18}
                    spellcheck="false"
                    class="border-input bg-black/80 text-foreground font-mono w-full rounded-xl border px-4 py-3 text-xs shadow-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            ></textarea>
        </div>
        <div class="flex justify-between">
            <Button variant="outline" onclick={() => (step = 2)}>
                <ArrowLeftIcon class="size-4 mr-1.5"/> Back
            </Button>
            <Button onclick={handleBuild} disabled={!step3Valid}>
                <RocketIcon class="size-4 mr-1.5"/> Deploy Stack
            </Button>
        </div>

        <!-- Step 4: Result -->
    {:else if step === 4}
        <div class="bg-card border rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b flex items-center gap-3">
                <TerminalIcon class="size-4 text-muted-foreground"/>
                <span class="text-sm font-medium">Deploy Output</span>
                {#if workerId}
                    <span class="text-xs text-muted-foreground ml-1">
                        → {connectedWorkers.find(w => w.id === workerId)?.name ?? "Worker"}
                    </span>
                {/if}
                {#if status === "building"}
                    <span class="flex items-center gap-1.5 text-xs text-blue-500 ml-auto">
                        <Loader class="size-3 animate-spin"/> Deploying…
                    </span>
                {:else if status === "success"}
                    <span class="flex items-center gap-1.5 text-xs text-green-500 ml-auto">
                        <CircleCheckBig class="size-3"/> Done
                    </span>
                {:else if status === "error"}
                    <span class="flex items-center gap-1.5 text-xs text-destructive ml-auto">
                        <CircleX class="size-3"/> Failed
                    </span>
                {/if}
            </div>
            <div class="bg-black/90 min-h-64 max-h-96 overflow-y-auto p-4 font-mono text-xs">
                {#if logs.length === 0}
                    <span class="text-muted-foreground">Deploying stack…</span>
                {:else}
                    {#each logs as log, i (i)}
                        <p class="{log.type === 'error' ? 'text-red-400' : 'text-green-400'} leading-5">
                            {log.message}
                        </p>
                    {/each}
                {/if}
            </div>
        </div>
        <div class="flex gap-3">
            {#if status === "error"}
                <Button variant="outline" onclick={() => (step = 3)} class="flex-1">
                    <ArrowLeftIcon class="size-4 mr-1.5"/> Edit Compose
                </Button>
                <Button onclick={handleBuild} class="flex-1">
                    <RocketIcon class="size-4 mr-1.5"/> Retry
                </Button>
            {:else if status === "success"}
                <Button variant="outline" onclick={() => goto("/dashboard/containers")} class="flex-1">
                    View Containers
                </Button>
                <Button onclick={() => { step = 1; projectId = ""; name = ""; logs = []; status = "idle"; expose = false; workerId = null; }}
                        class="flex-1">
                    Deploy Another
                </Button>
            {/if}
        </div>
    {/if}
</div>