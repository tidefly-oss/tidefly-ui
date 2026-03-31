<script lang="ts">
    import {goto} from "$app/navigation";
    import {ApiError} from "$lib/api/client";
    import {deployApi} from "$lib/api/v1/deploy";
    import {templatesApi} from "$lib/api/v1/templates";
    import {Button} from "$lib/components/ui/button/index.js";
    import {projectQueries} from "$lib/queries/projects.js";
    import {auth} from "$lib/stores/auth.svelte";
    import PortInput from "$lib/components/services/PortInput.svelte";
    import {
        CheckIcon, ChevronRightIcon, CircleIcon, CopyIcon,
        DatabaseIcon, EyeIcon, FolderIcon, LoaderIcon,
    } from "@lucide/svelte";
    import {createQuery, useQueryClient} from "@tanstack/svelte-query";
    import type {DeployResult, ServiceTemplate, TemplateField, TemplateSummary} from "$lib/api/v1/types";

    let {summaries}: { summaries: TemplateSummary[] } = $props();

    const qc = useQueryClient();

    const projectsQuery = createQuery(() => ({
        ...projectQueries.list(),
        enabled: !!auth.user,
    }));

    const isAdmin = $derived(auth.user?.role === 'admin');
    const allProjects = $derived(projectsQuery.data ?? []);
    const visibleProjects = $derived(
        isAdmin ? allProjects : allProjects.filter(p => auth.projectIds.includes(p.id))
    );

    type Step = "pick" | "configure" | "deploying" | "done";
    let step = $state<Step>("pick");
    let selected = $state<ServiceTemplate | null>(null);
    let loadingDetail = $state(false);
    let projectId = $state("");
    let version = $state("");
    let fields = $state<Record<string, string>>({});
    let deployError = $state<string | null>(null);
    let result = $state<DeployResult | null>(null);
    let copiedKey = $state<string | null>(null);

    $effect(() => {
        if (projectId === "" && visibleProjects.length === 1) {
            projectId = visibleProjects[0].id;
        }
    });

    const grouped = $derived(
        summaries.reduce<Record<string, TemplateSummary[]>>((acc, t) => {
            (acc[t.category] ??= []).push(t);
            return acc;
        }, {}),
    );

    async function selectTemplate(slug: string) {
        loadingDetail = true;
        try {
            selected = await templatesApi.get(slug);
            version = selected.default_version;
            fields = Object.fromEntries(
                (selected.fields ?? [])
                    .filter((f: TemplateField) => f.type !== "credential")
                    .map((f: TemplateField) => [f.key, String(f.default ?? "")]),
            );
            step = "configure";
        } catch (e) {
            console.error(e);
        } finally {
            loadingDetail = false;
        }
    }

    const visibleFields = $derived(
        selected?.fields?.filter((f: TemplateField) => f.type !== "credential") ?? [],
    );
    const credentialFields = $derived(
        selected?.fields?.filter((f: TemplateField) => f.type === "credential") ?? [],
    );
    const isValid = $derived(
        selected !== null &&
        projectId !== "" &&
        visibleFields.every(
            (f: TemplateField) => !f.required || String(fields[f.key] ?? "").trim() !== "",
        ),
    );
    const selectedProject = $derived(visibleProjects.find((p) => p.id === projectId));

    async function deploy() {
        if (!selected || !isValid) return;
        step = "deploying";
        deployError = null;
        try {
            result = await deployApi.deploy({
                template_slug: selected.slug,
                project_id: projectId,
                version,
                fields: Object.fromEntries(
                    Object.entries(fields).map(([k, v]) => [k, String(v)]),
                ),
            });
            step = "done";
        } catch (e) {
            deployError = e instanceof ApiError ? e.message : "Deploy failed";
            step = "configure";
        }
    }

    async function markShown() {
        if (!result) return;
        await deployApi.markShown(result.service.id);
        await qc.invalidateQueries({queryKey: ["services"]});
        await qc.invalidateQueries({queryKey: ["containers"]});
        await goto("/dashboard/services");
    }

    async function copyToClipboard(key: string, value: string) {
        await navigator.clipboard.writeText(value);
        copiedKey = key;
        setTimeout(() => (copiedKey = null), 2000);
    }

    const categoryLabel: Record<string, string> = {
        database: "Databases", cache: "Caches", messaging: "Messaging",
    };
    const categoryColor: Record<string, string> = {
        database: "bg-blue-500/10 text-blue-500",
        cache: "bg-orange-500/10 text-orange-500",
        messaging: "bg-purple-500/10 text-purple-500",
    };
</script>

<div class="w-full {step !== 'pick' ? 'max-w-2xl mx-auto' : ''} space-y-4">
    {#if step === "pick"}
        <div>
            <h1 class="text-lg font-semibold">Deploy a Service</h1>
            <p class="text-sm text-muted-foreground mt-0.5">Choose a template to get started</p>
        </div>

        {#each Object.entries(grouped) as [category, templates]}
            <div class="space-y-2">
                <h2 class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {categoryLabel[category] ?? category}
                </h2>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {#each templates as tmpl (tmpl.slug)}
                        <button
                                onclick={() => selectTemplate(tmpl.slug)}
                                disabled={loadingDetail}
                                class="bg-card border rounded-xl p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all group flex flex-col gap-3 disabled:opacity-50"
                        >
                            <span class="flex items-start justify-between">
                                <span class="rounded-lg p-2 {categoryColor[tmpl.category] ?? 'bg-muted text-muted-foreground'}">
                                    {#if loadingDetail}
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
                            <span class="flex gap-1 flex-wrap mt-auto">
                                {#each tmpl.versions.slice(0, 3) as v}
                                    <span class="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                        {v}{v === tmpl.default_version ? " ✓" : ""}
                                    </span>
                                {/each}
                                {#if tmpl.versions.length > 3}
                                    <span class="text-xs text-muted-foreground">+{tmpl.versions.length - 3}</span>
                                {/if}
                            </span>
                        </button>
                    {/each}
                </div>
            </div>
        {/each}

    {:else if step === "configure" && selected}
        <div>
            <h1 class="text-lg font-semibold">Configure {selected.name}</h1>
            <p class="text-sm text-muted-foreground mt-0.5">Passwords are auto-generated</p>
        </div>

        <!-- Project picker -->
        <div class="bg-card border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b text-sm font-medium flex items-center gap-2">
                <FolderIcon class="size-3.5" />
                Project
                <span class="text-destructive ml-0.5">*</span>
            </div>
            <div class="p-4">
                {#if projectsQuery.isPending}
                    <div class="flex gap-2">
                        {#each Array(2) as _, i (i)}
                            <div class="h-7 w-20 bg-muted rounded-lg animate-pulse"></div>
                        {/each}
                    </div>
                {:else if visibleProjects.length === 0}
                    <p class="text-sm text-muted-foreground">
                        {#if isAdmin}
                            No projects yet. <a href="/dashboard/projects/new" class="text-primary hover:underline">Create one first.</a>
                        {:else}
                            You have no projects assigned. Contact an admin.
                        {/if}
                    </p>
                {:else}
                    <div class="flex gap-2 flex-wrap">
                        {#each visibleProjects as p (p.id)}
                            <button
                                    onclick={() => (projectId = p.id)}
                                    class="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors {projectId === p.id
                                    ? 'border-primary bg-primary/5 text-primary'
                                    : 'hover:border-primary/40 text-muted-foreground'}"
                            >
                                <CircleIcon class="size-2 fill-current" style="color: {p.color}" />
                                {p.name}
                            </button>
                        {/each}
                    </div>
                    {#if selectedProject}
                        <p class="text-xs text-muted-foreground mt-2">
                            Network: <span class="font-mono">{selectedProject.network_name}</span>
                        </p>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- Version picker -->
        <div class="bg-card border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b text-sm font-medium">Version</div>
            <div class="p-4">
                <div class="flex gap-2 flex-wrap">
                    {#each selected.versions as v}
                        <button
                                onclick={() => (version = v)}
                                class="px-3 py-1.5 text-xs font-mono rounded-lg border transition-colors {version === v
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'hover:border-primary/40 text-muted-foreground'}"
                        >
                            {v}{v === selected.default_version ? " (default)" : ""}
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <!-- Fields -->
        {#if visibleFields.length > 0}
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="px-4 py-3 border-b text-sm font-medium">Configuration</div>
                <div class="p-4 space-y-4">
                    {#each visibleFields as f (f.key)}
                        {#if f.type === "port"}
                            <PortInput
                                    value={parseInt(fields[f.key] ?? String(f.default ?? "0"), 10)}
                                    onchange={(v) => (fields[f.key] = String(v))}
                                    label={f.label}
                                    required={f.required}
                            />
                        {:else if f.type === "select" && f.options}
                            <div class="space-y-1.5">
                                <label class="text-xs font-medium" for={f.key}>
                                    {f.label}
                                    {#if f.required}<span class="text-destructive ml-0.5">*</span>{/if}
                                </label>
                                <select
                                        id={f.key}
                                        bind:value={fields[f.key]}
                                        class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {#each f.options as opt}
                                        <option value={opt.value}>{opt.label}</option>
                                    {/each}
                                </select>
                            </div>
                        {:else}
                            <div class="space-y-1.5">
                                <label class="text-xs font-medium" for={f.key}>
                                    {f.label}
                                    {#if f.required}<span class="text-destructive ml-0.5">*</span>{/if}
                                </label>
                                <input
                                        id={f.key}
                                        type="text"
                                        placeholder={f.placeholder ?? String(f.default ?? "")}
                                        bind:value={fields[f.key]}
                                        class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                                />
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/if}

        {#if credentialFields.length > 0}
            <div class="bg-muted/40 border border-dashed rounded-xl p-4 flex gap-3">
                <EyeIcon class="size-4 text-muted-foreground shrink-0 mt-0.5" />
                <div class="text-xs text-muted-foreground">
                    <span class="font-medium text-foreground">Auto-generated: </span>
                    {credentialFields.map((f: TemplateField) => f.label).join(", ")} — shown once after deploy.
                </div>
            </div>
        {/if}

        {#if deployError}
            <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
                {deployError}
            </div>
        {/if}

        <div class="flex justify-end gap-2">
            <Button variant="outline" onclick={() => (step = "pick")}>Back</Button>
            <Button disabled={!isValid} onclick={deploy}>Deploy {selected.name}</Button>
        </div>

    {:else if step === "deploying"}
        <div class="bg-card border rounded-xl px-4 py-16 flex flex-col items-center gap-4 text-center">
            <LoaderIcon class="size-8 text-primary animate-spin" />
            <div>
                <p class="font-medium text-sm">Deploying {selected?.name}…</p>
                <p class="text-xs text-muted-foreground mt-1">
                    Pulling image and starting container in <span class="font-mono">{selectedProject?.network_name}</span>
                </p>
            </div>
        </div>

    {:else if step === "done" && result}
        <div>
            <h1 class="text-lg font-semibold">Service Deployed</h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                <span class="font-medium text-foreground">{result.service.name}</span> is running in
                <span class="font-mono text-xs">{selectedProject?.network_name}</span>.
                Save the credentials — they won't be shown again.
            </p>
        </div>

        {#if (result.credentials ?? []).length > 0}
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="px-4 py-3 border-b flex items-center gap-2">
                    <EyeIcon class="size-3.5 text-amber-500" />
                    <span class="text-sm font-medium">Credentials</span>
                    <span class="text-xs text-muted-foreground ml-auto">Copy and store securely</span>
                </div>
                <div class="divide-y">
                    {#each result.credentials ?? [] as cred}
                        <div class="px-4 py-3 flex items-center gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="text-xs text-muted-foreground">{cred.label}</div>
                                <div class="text-sm font-mono mt-0.5 truncate">{cred.plaintext}</div>
                            </div>
                            <button
                                    onclick={() => copyToClipboard(cred.key, cred.plaintext)}
                                    class="shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                            >
                                {#if copiedKey === cred.key}
                                    <CheckIcon class="size-3.5 text-green-500" />
                                {:else}
                                    <CopyIcon class="size-3.5 text-muted-foreground" />
                                {/if}
                            </button>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="bg-muted/40 border border-dashed rounded-xl px-4 py-3 text-xs text-muted-foreground">
            Clicking "Done" marks credentials as shown and they cannot be retrieved again.
        </div>

        <div class="flex justify-end">
            <Button onclick={markShown}>
                <CheckIcon class="size-3.5 mr-1.5" />
                Done
            </Button>
        </div>
    {/if}
</div>