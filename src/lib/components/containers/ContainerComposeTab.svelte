<script lang="ts">
  import { goto } from "$app/navigation";
  import { containersApi } from "$lib/api/v1/containers";
  import { projectsApi } from "$lib/api/v1/projects";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { auth } from "$lib/stores/auth.svelte";
  import { projectsStore } from "$lib/stores/projects.svelte";
  import {
    ArrowLeftIcon, ArrowRightIcon, CheckIcon, CircleCheckBig,
    CircleIcon, CircleX, ContainerIcon, Loader, RocketIcon,
  } from "@lucide/svelte";
  import { createQuery, useQueryClient } from "@tanstack/svelte-query";
  import { createMutation } from "@tanstack/svelte-query";

  const qc = useQueryClient();

  const projectsQuery = createQuery(() => ({
    queryKey: ["projects"],
    queryFn: () => projectsApi.list(),
  }));

  const isAdmin = $derived(auth.user?.role === 'admin');
  const visibleProjects = $derived(
          isAdmin
                  ? (projectsQuery.data ?? [])
                  : (projectsQuery.data ?? []).filter(p => auth.projectIds.includes(p.id))
  );

  type Step = 1 | 2 | 3;
  let step = $state<Step>(1);

  let projectId   = $state("");
  let projectName = $state("");
  let stackName   = $state("");
  let compose     = $state(`services:
  web:
    image: nginx:alpine
    ports:
      - "8080:80"
    restart: unless-stopped`);

  const deployMutation = createMutation(() => ({
    mutationFn: () =>
            containersApi.deployCompose({
              compose: compose.trim(),
              stack_name: stackName.trim(),
              project_id: projectId,
            }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["containers"] });
    },
  }));

  const servicePreview = $derived(() => {
    const lines = compose.split("\n");
    let inServices = false;
    const services: string[] = [];
    for (const line of lines) {
      if (line === "services:") { inServices = true; continue; }
      if (inServices && /^\w/.test(line)) break;
      if (inServices) {
        const m = line.match(/^ {2}(\w[\w-]*):/);
        if (m) services.push(m[1]);
      }
    }
    return services;
  });

  const step1Valid = $derived(projectId.length > 0);
  const step2Valid = $derived(stackName.trim().length > 0 && compose.trim().length > 0);

  const steps = ["Project", "Stack", "Deploy"];
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
          <div class="size-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all
            {isDone ? 'bg-primary border-primary text-primary-foreground' : isActive ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'}">
            {#if isDone}<CheckIcon class="size-3.5" />{:else}{n}{/if}
          </div>
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
        <p class="text-sm text-muted-foreground mt-0.5">All stack containers will be deployed into this project's network.</p>
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
                    onclick={() => { projectId = p.id; projectName = p.name; }}
                    class="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all
                {projectId === p.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/50'}"
            >
              <CircleIcon class="size-3 fill-current shrink-0" style="color: {p.color}" />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium">{p.name}</p>
                <p class="text-xs text-muted-foreground font-mono mt-0.5">{p.network_name}</p>
              </div>
              {#if projectId === p.id}<CheckIcon class="size-4 text-primary shrink-0" />{/if}
            </button>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex justify-end">
      <Button onclick={() => (step = 2)} disabled={!step1Valid}>
        Continue <ArrowRightIcon class="size-4 ml-1.5" />
      </Button>
    </div>

    <!-- Step 2: Stack config -->
  {:else if step === 2}
    <div class="space-y-4">
      <div class="bg-card border rounded-xl p-6 space-y-4">
        <div>
          <h2 class="font-semibold">Stack Configuration</h2>
          <p class="text-sm text-muted-foreground mt-0.5">Name your stack and paste your docker-compose.yml.</p>
        </div>
        <div class="space-y-1.5">
          <Label for="cs-name">Stack Name <span class="text-destructive">*</span></Label>
          <Input id="cs-name" bind:value={stackName} placeholder="my-stack" />
          <p class="text-xs text-muted-foreground font-mono">
            Containers will be named: <span class="text-foreground">{stackName || "my-stack"}-servicename</span>
          </p>
        </div>
        <div class="space-y-1.5">
          <Label>docker-compose.yml <span class="text-destructive">*</span></Label>
          <textarea
                  bind:value={compose}
                  rows={18}
                  spellcheck="false"
                  class="border-input bg-black/80 text-foreground font-mono w-full rounded-xl border px-4 py-3 text-xs shadow-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          ></textarea>
        </div>
      </div>

      {#if servicePreview().length > 0}
        <div class="bg-muted/50 border rounded-xl p-4">
          <p class="text-xs font-medium text-muted-foreground mb-2">Containers that will be created</p>
          <div class="flex flex-wrap gap-2">
            {#each servicePreview() as svc (svc)}
              <div class="flex items-center gap-1.5 bg-card border rounded-lg px-2.5 py-1.5">
                <ContainerIcon class="size-3 text-muted-foreground" />
                <span class="font-mono text-xs">{stackName || "stack"}-{svc}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="flex justify-between">
      <Button variant="outline" onclick={() => (step = 1)}>
        <ArrowLeftIcon class="size-4 mr-1.5" /> Back
      </Button>
      <Button onclick={() => deployMutation.mutate()} disabled={!step2Valid || deployMutation.isPending}>
        {#if deployMutation.isPending}
          <Loader class="size-4 mr-1.5 animate-spin" /> Deploying…
        {:else}
          <RocketIcon class="size-4 mr-1.5" /> Deploy Stack
        {/if}
      </Button>
    </div>

    {#if deployMutation.isError}
      <div class="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
        <CircleX class="size-4 text-destructive shrink-0 mt-0.5" />
        <div>
          <p class="text-sm font-medium text-destructive">Deployment failed</p>
          <p class="text-xs text-muted-foreground mt-0.5 font-mono">{deployMutation.error?.message ?? "Unknown error"}</p>
        </div>
      </div>
    {/if}

    {#if deployMutation.isSuccess}
      {(step = 3) && ""}
    {/if}

    <!-- Step 3: Success -->
  {:else if step === 3}
    {@const result = deployMutation.data}
    <div class="bg-card border rounded-xl p-6 space-y-4">
      <div class="flex items-center gap-3">
        <div class="size-10 rounded-full bg-green-500/10 flex items-center justify-center">
          <CircleCheckBig class="size-5 text-green-500" />
        </div>
        <div>
          <h2 class="font-semibold">Stack deployed successfully</h2>
          <p class="text-sm text-muted-foreground mt-0.5">
            All containers are running in <span class="font-mono text-xs">{projectName}</span>
          </p>
        </div>
      </div>
      <div class="bg-muted/50 rounded-xl p-4 space-y-2">
        <p class="text-xs font-medium text-muted-foreground">Created containers</p>
        {#each result?.containers ?? [] as cname (cname)}
          <div class="flex items-center gap-2">
            <span class="size-1.5 rounded-full bg-green-500 shrink-0"></span>
            <span class="font-mono text-sm">{cname}</span>
          </div>
        {/each}
        <p class="text-xs text-muted-foreground font-mono pt-1">stack_id: {result?.stack_id}</p>
      </div>
    </div>
    <div class="flex gap-3">
      <Button variant="outline" onclick={() => goto("/dashboard/containers")} class="flex-1">View Containers</Button>
      <Button onclick={() => { step = 1; projectId = ""; stackName = ""; deployMutation.reset(); }} class="flex-1">Deploy Another Stack</Button>
    </div>
  {/if}
</div>