<script lang="ts">
import {
	CheckIcon,
	ChevronRightIcon,
	CircleIcon,
	CopyIcon,
	DatabaseIcon,
	GlobeIcon,
	LoaderIcon,
} from "@lucide/svelte";
import { useQueryClient } from "@tanstack/svelte-query";
import { getContext } from "svelte";
import { goto } from "$app/navigation";
import { ApiError } from "$lib/api/client";
import { servicesApi } from "$lib/api/v1/manifest";
import { templatesApi } from "$lib/api/v1/templates";
import type { ServiceTemplate, TemplateField, TemplateSummary } from "$lib/api/v1/types";
import type { DashboardOverview } from "$lib/api/v1/types/dashboard.js";
import PortInput from "$lib/components/containers/PortInput.svelte";
import { Button } from "$lib/components/ui/button";
import { auth } from "$lib/stores/auth.svelte.js";
import { wsStore } from "$lib/stores/ws.svelte.js";

let { summaries }: { summaries: TemplateSummary[] } = $props();

const ctx = getContext<{ data: DashboardOverview | undefined; isPending: boolean }>("dashboard");
const qc = useQueryClient();

const isAdmin = $derived(auth.user?.role === "admin");
const allProjects = $derived(ctx.data?.projects ?? []);
const visibleProjects = $derived(
	isAdmin ? allProjects : allProjects.filter((p) => auth.projectIds.includes(p.id))
);

type Step = "pick" | "configure" | "deploying" | "done";
let step = $state<Step>("pick");
let selected = $state<ServiceTemplate | null>(null);
let selectedVersion = $state("");
let loadingDetail = $state(false);
let projectId = $state("");
let fields = $state<Record<string, string>>({});
let deployError = $state<string | null>(null);
let deployedName = $state<string | null>(null);
let deployedUrl = $state<string | null>(null);
let credentials = $state<Record<string, string>>({});
let copiedKey = $state<string | null>(null);
let expose = $state(false);

$effect(() => {
	if (projectId === "" && visibleProjects.length === 1) {
		projectId = visibleProjects[0].id;
	}
});

const grouped = $derived(
	summaries.reduce<Record<string, TemplateSummary[]>>((acc, t) => {
		if (!acc[t.category]) acc[t.category] = [];
		acc[t.category].push(t);
		return acc;
	}, {})
);

async function selectTemplate(slug: string) {
	loadingDetail = true;
	try {
		selected = await templatesApi.get(slug);
		selectedVersion = selected.default_version ?? selected.versions?.[0] ?? "latest";
		fields = Object.fromEntries(
			(selected.fields ?? [])
				.filter((f: TemplateField) => f.type !== "credential")
				.map((f: TemplateField) => [f.key, String(f.default ?? "")])
		);
		step = "configure";
	} catch (e) {
		console.error(e);
	} finally {
		loadingDetail = false;
	}
}

const exposeFields = $derived(
	(selected?.fields ?? []).filter(
		(f: TemplateField) => f.type !== "credential" && (f.key === "domain" || f.key === "port")
	)
);

const otherFields = $derived(
	(selected?.fields ?? []).filter(
		(f: TemplateField) =>
			f.type !== "credential" &&
			f.key !== "domain" &&
			f.key !== "port" &&
			(!f.depends_on || fields[f.depends_on] === "true")
	)
);

const isValid = $derived(
	selected !== null &&
		projectId !== "" &&
		otherFields.every(
			(f: TemplateField) => !f.required || String(fields[f.key] ?? "").trim() !== ""
		) &&
		(!expose ||
			exposeFields.every(
				(f: TemplateField) => !f.required || String(fields[f.key] ?? "").trim() !== ""
			))
);

const selectedProject = $derived(visibleProjects.find((p) => p.id === projectId));

async function deploy() {
	if (!selected || !isValid) return;
	step = "deploying";
	deployError = null;
	wsStore.setDeployDoneCallback(() => {
		goto("/dashboard/containers");
	});
	try {
		const result = await servicesApi.createFromTemplate({
			slug: selected.slug,
			version: selectedVersion,
			fields,
			project_id: projectId,
			expose,
		});
		credentials = result.credentials ?? {};
	} catch (e) {
		deployError = e instanceof ApiError ? e.message : "Deploy failed";
		step = "configure";
		wsStore.setDeployDoneCallback(null);
	}
}

async function copyToClipboard(value: string, key: string) {
	await navigator.clipboard.writeText(value);
	copiedKey = key;
	setTimeout(() => (copiedKey = null), 2000);
}

const categoryLabel: Record<string, string> = {
	database: "Databases",
	cache: "Caches",
	messaging: "Messaging",
	utilities: "Utilities",
};

const categoryColor: Record<string, string> = {
	database: "bg-blue-500/10 text-blue-500",
	cache: "bg-orange-500/10 text-orange-500",
	messaging: "bg-purple-500/10 text-purple-500",
	utilities: "bg-green-500/10 text-green-500",
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
                        </button>
                    {/each}
                </div>
            </div>
        {/each}

    {:else if step === "configure" && selected}
        <div>
            <h1 class="text-lg font-semibold">Configure {selected.name}</h1>
            <p class="text-sm text-muted-foreground mt-0.5">Set up your service</p>
        </div>

        {#if selected.versions && selected.versions.length > 1}
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="px-4 py-3 border-b text-sm font-medium">Version</div>
                <div class="p-4 flex flex-wrap gap-2">
                    {#each selected.versions as v (v)}
                        <button
                                onclick={() => (selectedVersion = v)}
                                class="px-3 py-1.5 text-xs rounded-lg border transition-colors {selectedVersion === v ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40 text-muted-foreground'}"
                        >
                            {v}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="bg-card border rounded-xl p-6 space-y-5">
            <div>
                <h2 class="font-semibold">Service Configuration</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Project, network access and settings.</p>
            </div>

            <div class="space-y-2">
                <p class="text-xs font-medium">Project <span class="text-destructive">*</span></p>
                {#if ctx.isPending}
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
                                    class="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg border transition-colors {projectId === p.id ? 'border-primary bg-primary/5 text-primary' : 'hover:border-primary/40 text-muted-foreground'}"
                            >
                                <CircleIcon class="size-2 fill-current" style="color: {p.color}" />
                                {p.name}
                            </button>
                        {/each}
                    </div>
                    {#if selectedProject}
                        <p class="text-xs text-muted-foreground mt-1">
                            Network: <span class="font-mono">{selectedProject.network_name}</span>
                        </p>
                    {/if}
                {/if}
            </div>

            <button
                    onclick={() => { expose = !expose; if (!expose) { fields['domain'] = ''; } }}
                    class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all {expose ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}"
            >
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
                    {#each exposeFields as f (f.key)}
                        {#if f.type === "port"}
                            <div class="space-y-1.5">
                                <label class="text-xs font-medium" for={f.key}>
                                    {f.label}
                                    {#if f.required}<span class="text-destructive ml-0.5">*</span>{/if}
                                </label>
                                <PortInput
                                        value={parseInt(fields[f.key] ?? String(f.default ?? "0"), 10)}
                                        onchange={(v) => (fields[f.key] = String(v))}
                                        label={f.label}
                                        required={f.required}
                                />
                            </div>
                        {:else}
                            <div class="space-y-1.5">
                                <label class="text-xs font-medium" for={f.key}>
                                    {f.label}
                                    {#if f.required}<span class="text-destructive ml-0.5">*</span>{:else}<span class="text-muted-foreground text-xs">(optional)</span>{/if}
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
            {/if}

            {#each otherFields as f (f.key)}
                {#if f.type === "boolean"}
                    <button
                            onclick={() => (fields[f.key] = fields[f.key] === "true" ? "false" : "true")}
                            class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all {fields[f.key] === 'true' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}"
                    >
                        <span class="flex-1">
                            <span class="text-sm font-medium block">{f.label}</span>
                            {#if f.hint}<span class="text-xs text-muted-foreground">{f.hint}</span>{/if}
                        </span>
                        {#if fields[f.key] === "true"}<CheckIcon class="size-4 text-primary shrink-0" />{/if}
                    </button>
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
                        {#if f.hint}
                            <p class="text-xs text-muted-foreground">{f.hint}</p>
                        {/if}
                    </div>
                {/if}
            {/each}
        </div>

        {#if deployError}
            <div class="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm">
                {deployError}
            </div>
        {/if}

        <div class="flex justify-end gap-2">
            <Button variant="outline" onclick={() => { step = "pick"; expose = false; }}>Back</Button>
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

    {:else if step === "done"}
        <div>
            <h1 class="text-lg font-semibold">Service Deployed</h1>
            <p class="text-sm text-muted-foreground mt-0.5">
                <span class="font-medium text-foreground">{deployedName}</span> is now running.
            </p>
        </div>

        {#if deployedUrl}
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="px-4 py-3 border-b text-sm font-medium">Public URL</div>
                <div class="p-4 flex items-center gap-3">
                    <span class="font-mono text-sm flex-1 truncate">{deployedUrl}</span>
                    <button
                            onclick={() => copyToClipboard(deployedUrl!, "url")}
                            class="shrink-0 p-1.5 rounded hover:bg-muted transition-colors"
                    >
                        {#if copiedKey === "url"}
                            <CheckIcon class="size-3.5 text-green-500" />
                        {:else}
                            <CopyIcon class="size-3.5 text-muted-foreground" />
                        {/if}
                    </button>
                </div>
            </div>
        {/if}

        {#if Object.keys(credentials).length > 0}
            <div class="bg-card border rounded-xl overflow-hidden">
                <div class="px-4 py-3 border-b">
                    <p class="text-sm font-medium">Generated Credentials</p>
                    <p class="text-xs text-muted-foreground mt-0.5">Save these now — they won't be shown again.</p>
                </div>
                <div class="p-4 space-y-3">
                    {#each Object.entries(credentials) as [key, value] (key)}
                        {@const field = selected?.fields?.find((f) => f.key === key)}
                        <div class="space-y-1">
                            <p class="text-xs font-medium text-muted-foreground">{field?.label ?? key}</p>
                            <div class="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                                <code class="text-xs font-mono flex-1 break-all">{value}</code>
                                <button
                                        onclick={() => copyToClipboard(value, key)}
                                        class="shrink-0 p-1 rounded hover:bg-muted transition-colors"
                                >
                                    {#if copiedKey === key}
                                        <CheckIcon class="size-3.5 text-green-500" />
                                    {:else}
                                        <CopyIcon class="size-3.5 text-muted-foreground" />
                                    {/if}
                                </button>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        <div class="flex justify-end gap-2">
            <Button variant="outline" onclick={() => goto("/dashboard/containers")}>View Services</Button>
            <Button onclick={() => { step = "pick"; selected = null; fields = {}; credentials = {}; deployedName = null; deployedUrl = null; expose = false; }}>
                <CheckIcon class="size-3.5 mr-1.5" /> Deploy Another
            </Button>
        </div>
    {/if}
</div>