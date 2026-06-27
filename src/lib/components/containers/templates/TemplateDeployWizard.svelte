<script lang="ts">
    import { CheckIcon, CopyIcon, LoaderIcon } from "@lucide/svelte";
    import { useQueryClient } from "@tanstack/svelte-query";
    import { getContext } from "svelte";
    import { goto } from "$app/navigation";
    import { ApiError } from "$lib/api/client";
    import { servicesApi } from "$lib/api/v1/manifest";
    import { templatesApi } from "$lib/api/v1/templates";
    import type { ServiceTemplate, TemplateField, TemplateSummary } from "$lib/api/v1/types";
    import type { DashboardOverview } from "$lib/api/v1/types/dashboard.js";
    import { Button } from "$lib/components/ui/button";
    import { auth } from "$lib/stores/auth.svelte.js";
    import { wsStore } from "$lib/stores/ws.svelte.js";
    import TemplateConfigureForm from "./TemplateConfigureForm.svelte";
    import TemplatePicker from "./TemplatePicker.svelte";

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

    const isValid = $derived(
        selected !== null &&
        projectId !== "" &&
        (selected.fields ?? [])
            .filter(
                (f: TemplateField) =>
                    f.type !== "credential" &&
                    f.key !== "domain" &&
                    f.key !== "port" &&
                    (!f.depends_on || fields[f.depends_on] === "true")
            )
            .every((f: TemplateField) => !f.required || String(fields[f.key] ?? "").trim() !== "") &&
        (!expose ||
            (selected.fields ?? [])
                .filter((f: TemplateField) => f.key === "domain" || f.key === "port")
                .every((f: TemplateField) => !f.required || String(fields[f.key] ?? "").trim() !== ""))
    );

    const selectedProject = $derived(visibleProjects.find((p) => p.id === projectId));

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
            deployedName = selected.name;
            step = "done";
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

    function reset() {
        step = "pick";
        selected = null;
        fields = {};
        credentials = {};
        deployedName = null;
        deployedUrl = null;
        expose = false;
    }
</script>

<div class="w-full {step !== 'pick' ? 'max-w-2xl mx-auto' : ''} space-y-4">

    {#if step === "pick"}
        <TemplatePicker {summaries} loading={loadingDetail} onSelect={selectTemplate} />

    {:else if step === "configure" && selected}
        <TemplateConfigureForm
                {selected}
                {selectedVersion}
                {fields}
                {expose}
                {projectId}
                projects={visibleProjects}
                isPendingProjects={ctx.isPending}
                {deployError}
                {isValid}
                onVersionChange={(v) => (selectedVersion = v)}
                onFieldChange={(key, value) => (fields[key] = value)}
                onExposeToggle={() => {
				expose = !expose;
				if (!expose) fields["domain"] = "";
			}}
                onProjectChange={(id) => (projectId = id)}
                onBack={() => { step = "pick"; expose = false; }}
                onDeploy={deploy}
        />

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
            <Button onclick={reset}>
                <CheckIcon class="size-3.5 mr-1.5" /> Deploy Another
            </Button>
        </div>
    {/if}
</div>