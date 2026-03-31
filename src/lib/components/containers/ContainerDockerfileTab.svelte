<script lang="ts">
    import {goto} from "$app/navigation";
    import {containersApi} from "$lib/api/v1/containers";
    import {projectQueries} from "$lib/queries/projects.js";
    import {agentApi, type WorkerNode} from "$lib/api/v1/agent/index.js";
    import {Button} from "$lib/components/ui/button/index.js";
    import {Input} from "$lib/components/ui/input/index.js";
    import {Label} from "$lib/components/ui/label/index.js";
    import {auth} from "$lib/stores/auth.svelte";
    import {
        ArrowLeftIcon, ArrowRightIcon, CheckIcon,
        CircleCheckBig, CircleIcon, CircleX,
        GlobeIcon, Loader, RocketIcon, ServerIcon, TerminalIcon,
    } from "@lucide/svelte";
    import {createQuery, useQueryClient} from "@tanstack/svelte-query";

    const qc = useQueryClient();

    interface Props {
        initialName?: string;
        initialGitUrl?: string;
        initialBranch?: string;
    }

    let {initialName = "", initialGitUrl = "", initialBranch = ""}: Props = $props();

    const projectsQuery = createQuery(() => ({
        ...projectQueries.list(),
        enabled: !!auth.user,
    }));

    const workersQuery = createQuery(() => ({
        queryKey: ["workers"],
        queryFn: () => agentApi.listWorkers(),
        staleTime: 30_000,
    }));

    const isAdmin = $derived(auth.user?.role === 'admin');
    const visibleProjects = $derived(
        isAdmin
            ? (projectsQuery.data ?? [])
            : (projectsQuery.data ?? []).filter(p => auth.projectIds.includes(p.id))
    );
    const connectedWorkers = $derived(
        (workersQuery.data ?? []).filter((w: WorkerNode) => w.status === "connected")
    );

    type Step = 1 | 2 | 3 | 4;
    let step = $state<Step>(1);

    let projectId    = $state("");
    let projectName  = $state("");
    let workerId     = $state<string | null>(null); // null = Plane (default)
    let name         = $state("");
    let tag          = $state("");
    let port         = $state("");
    let restart      = $state("unless-stopped");
    let dockerfile   = $state("");
    let expose       = $state(false);
    let caddyPort    = $state("80");
    let customDomain = $state("");

    $effect(() => {
        if (initialName && !name) name = initialName;
    });

    $effect(() => {
        if (dockerfile) return;
        if (initialGitUrl) {
            dockerfile = `FROM alpine/git AS clone\nRUN git clone --branch ${initialBranch || "main"} --depth 1 ${initialGitUrl} /app\n\nFROM alpine\nWORKDIR /app\nCOPY --from=clone /app .\n# Add your build steps here`;
        } else {
            dockerfile = `FROM nginx:alpine\nRUN echo "<h1>Hello from Tidefly!</h1>" > /usr/share/nginx/html/index.html\nEXPOSE 80`;
        }
    });

    let building = $state(false);
    let logs     = $state<{ type: string; message: string }[]>([]);
    let status   = $state<"idle" | "building" | "success" | "error">("idle");

    function selectProject(id: string, pname: string) {
        projectId = id;
        projectName = pname;
    }

    const step1Valid = $derived(projectId.length > 0);
    const step2Valid = $derived(name.trim().length > 0);
    const step3Valid = $derived(dockerfile.trim().length > 0);

    async function handleBuild() {
        if (building) return;
        logs   = [];
        status = "building";
        building = true;
        step = 4;

        try {
            const resp = await fetch(containersApi.dockerfileBuildUrl(), {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name:          name.trim(),
                    tag:           tag.trim() || `tidefly/${name.trim()}:latest`,
                    port:          expose ? parseInt(caddyPort) : undefined,
                    expose,
                    custom_domain: customDomain.trim() || undefined,
                    restart,
                    dockerfile:    dockerfile.trim(),
                    project_id:    projectId,
                    worker_id:     workerId ?? undefined,
                }),
                credentials: "include",
            });

            if (!resp.ok || !resp.body) {
                logs     = [{type: "error", message: "Failed to start build"}];
                status   = "error";
                building = false;
                return;
            }

            const reader  = resp.body.getReader();
            const decoder = new TextDecoder();
            let buffer    = "";

            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, {stream: true});
                const parts = buffer.split("\n\n");
                buffer = parts.pop() ?? "";
                for (const part of parts) {
                    const eventLine = part.match(/^event: (\w+)/m)?.[1];
                    const dataLine  = part.match(/^data: (.+)/m)?.[1];
                    if (!eventLine || !dataLine) continue;
                    try {
                        const parsed  = JSON.parse(dataLine);
                        const message = parsed.message ?? dataLine;
                        if (eventLine === "done") {
                            status   = "success";
                            building = false;
                            logs     = [...logs, {type: "done", message}];
                            await qc.invalidateQueries({queryKey: ["containers"]});
                        } else if (eventLine === "error") {
                            status   = "error";
                            building = false;
                            logs     = [...logs, {type: "error", message}];
                        } else {
                            logs = [...logs, {type: eventLine, message}];
                        }
                    } catch {
                        logs = [...logs, {type: eventLine ?? "build", message: dataLine}];
                    }
                }
            }
        } catch (e) {
            logs     = [...logs, {type: "error", message: String(e)}];
            status   = "error";
            building = false;
        }
    }

    const steps = ["Project", "Config", "Dockerfile", "Deploy"];

    function workerLabel(w: WorkerNode) {
        return w.name.length > 28 ? w.name.slice(0, 24) + "…" : w.name;
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
                <p class="text-sm text-muted-foreground mt-0.5">Your container will be deployed into this project's network.</p>
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
                                onclick={() => selectProject(p.id, p.name)}
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
                <h2 class="font-semibold">Container Configuration</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Basic settings for your container.</p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <Label for="df-name">Container Name <span class="text-destructive">*</span></Label>
                    <Input id="df-name" bind:value={name} placeholder="my-app"/>
                    <p class="text-xs text-muted-foreground">Lowercase letters, numbers, hyphens</p>
                </div>
                <div class="space-y-1.5">
                    <Label for="df-tag">Image Tag <span class="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                    <Input id="df-tag" bind:value={tag} placeholder="tidefly/my-app:latest"/>
                    <p class="text-xs text-muted-foreground">Auto-generated if empty</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="space-y-1.5">
                    <Label for="df-port">Port Mapping <span class="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                    <Input id="df-port" bind:value={port} placeholder="8080:80"/>
                    <p class="text-xs text-muted-foreground">host:container</p>
                </div>
                <div class="space-y-1.5">
                    <Label for="df-restart">Restart Policy</Label>
                    <select id="df-restart" bind:value={restart}
                            class="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm">
                        <option value="unless-stopped">unless-stopped</option>
                        <option value="always">always</option>
                        <option value="on-failure">on-failure</option>
                        <option value="no">no</option>
                    </select>
                </div>
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
                    <span class="text-xs text-muted-foreground">Automatically create a public HTTPS route</span>
                </span>
                {#if expose}<CheckIcon class="size-4 text-primary shrink-0"/>{/if}
            </button>

            {#if expose}
                <div class="grid grid-cols-2 gap-4">
                    <div class="space-y-1.5">
                        <Label for="df-caddy-port">Container Port</Label>
                        <Input id="df-caddy-port" bind:value={caddyPort} placeholder="80" type="number"/>
                        <p class="text-xs text-muted-foreground">Port your app listens on inside the container</p>
                    </div>
                    <div class="space-y-1.5">
                        <Label for="df-domain">Custom Domain <span class="text-muted-foreground text-xs">(optional)</span></Label>
                        <Input id="df-domain" bind:value={customDomain} placeholder="myapp.example.com"/>
                    </div>
                </div>
            {/if}

            <!-- Worker selection — only shown when workers are connected -->
            {#if connectedWorkers.length > 0}
                <div class="space-y-2 pt-1">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">Deploy Target</p>

                    <!-- Plane (default) -->
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

                    <!-- Connected workers -->
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

        <!-- Step 3: Dockerfile -->
    {:else if step === 3}
        <div class="bg-card border rounded-xl p-6 space-y-4">
            <div>
                <h2 class="font-semibold">Dockerfile</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Paste your Dockerfile or write one from scratch.</p>
            </div>
            <textarea
                    bind:value={dockerfile}
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
                <RocketIcon class="size-4 mr-1.5"/> Build & Deploy
            </Button>
        </div>

        <!-- Step 4: Build output -->
    {:else if step === 4}
        <div class="bg-card border rounded-xl overflow-hidden">
            <div class="px-5 py-4 border-b flex items-center gap-3">
                <TerminalIcon class="size-4 text-muted-foreground"/>
                <span class="text-sm font-medium">Build Output</span>
                {#if workerId}
                    <span class="text-xs text-muted-foreground ml-1">
                        → {connectedWorkers.find(w => w.id === workerId)?.name ?? "Worker"}
                    </span>
                {/if}
                {#if status === "building"}
                    <span class="flex items-center gap-1.5 text-xs text-blue-500 ml-auto">
                        <Loader class="size-3 animate-spin"/> Building…
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
                    <span class="text-muted-foreground">Starting build…</span>
                {:else}
                    {#each logs as log, i (i)}
                        <p class="{log.type === 'error' ? 'text-red-400' : log.type === 'done' ? 'text-green-400' : log.type === 'status' ? 'text-blue-400' : 'text-gray-300'} leading-5">
                            {log.message}
                        </p>
                    {/each}
                {/if}
            </div>
        </div>
        <div class="flex gap-3">
            {#if status === "error"}
                <Button variant="outline" onclick={() => (step = 3)} class="flex-1">
                    <ArrowLeftIcon class="size-4 mr-1.5"/> Edit Dockerfile
                </Button>
                <Button onclick={handleBuild} class="flex-1">
                    <RocketIcon class="size-4 mr-1.5"/> Retry
                </Button>
            {:else if status === "success"}
                <Button variant="outline" onclick={() => goto("/dashboard/containers")} class="flex-1">
                    View Containers
                </Button>
                <Button onclick={() => { step = 1; projectId = ""; name = ""; tag = ""; port = ""; logs = []; status = "idle"; expose = false; caddyPort = "80"; customDomain = ""; workerId = null; }}
                        class="flex-1">
                    Deploy Another
                </Button>
            {/if}
        </div>
    {/if}
</div>