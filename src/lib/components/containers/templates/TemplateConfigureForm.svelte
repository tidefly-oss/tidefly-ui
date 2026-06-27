<script lang="ts">
    import { CheckIcon, CircleIcon, GlobeIcon } from "@lucide/svelte";
    import type { ServiceTemplate, TemplateField } from "$lib/api/v1/types";
    import type { Project } from "$lib/api/v1/types";
    import PortInput from "$lib/components/containers/PortInput.svelte";
    import { Button } from "$lib/components/ui/button";
    import { auth } from "$lib/stores/auth.svelte.js";

    type Props = {
        selected: ServiceTemplate;
        selectedVersion: string;
        fields: Record<string, string>;
        expose: boolean;
        projectId: string;
        projects: Project[];
        isPendingProjects: boolean;
        deployError: string | null;
        isValid: boolean;
        onVersionChange: (v: string) => void;
        onFieldChange: (key: string, value: string) => void;
        onExposeToggle: () => void;
        onProjectChange: (id: string) => void;
        onBack: () => void;
        onDeploy: () => void;
    };

    let {
        selected,
        selectedVersion,
        fields,
        expose,
        projectId,
        projects,
        isPendingProjects,
        deployError,
        isValid,
        onVersionChange,
        onFieldChange,
        onExposeToggle,
        onProjectChange,
        onBack,
        onDeploy,
    }: Props = $props();

    const isAdmin = $derived(auth.user?.role === "admin");

    const exposeFields = $derived(
        (selected.fields ?? []).filter(
            (f: TemplateField) => f.type !== "credential" && (f.key === "domain" || f.key === "port")
        )
    );

    const otherFields = $derived(
        (selected.fields ?? []).filter(
            (f: TemplateField) =>
                f.type !== "credential" &&
                f.key !== "domain" &&
                f.key !== "port" &&
                (!f.depends_on || fields[f.depends_on] === "true")
        )
    );

    const selectedProject = $derived(projects.find((p) => p.id === projectId));
</script>

<div class="space-y-4">
    <div>
        <h1 class="text-lg font-semibold">Configure {selected.name}</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Set up your service</p>
    </div>

    <!-- Version picker -->
    {#if selected.versions && selected.versions.length > 1}
        <div class="bg-card border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b text-sm font-medium">Version</div>
            <div class="p-4 flex flex-wrap gap-2">
                {#each selected.versions as v (v)}
                    <button
                            onclick={() => onVersionChange(v)}
                            class="px-3 py-1.5 text-xs rounded-lg border transition-colors {selectedVersion === v
							? 'border-primary bg-primary/5 text-primary'
							: 'hover:border-primary/40 text-muted-foreground'}"
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

        <!-- Project picker -->
        <div class="space-y-2">
            <p class="text-xs font-medium">Project <span class="text-destructive">*</span></p>
            {#if isPendingProjects}
                <div class="flex gap-2">
                    {#each Array(2) as _, i (i)}
                        <div class="h-7 w-20 bg-muted rounded-lg animate-pulse"></div>
                    {/each}
                </div>
            {:else if projects.length === 0}
                <p class="text-sm text-muted-foreground">
                    {#if isAdmin}
                        No projects yet. <a href="/dashboard/projects/new" class="text-primary hover:underline">Create one first.</a>
                    {:else}
                        You have no projects assigned. Contact an admin.
                    {/if}
                </p>
            {:else}
                <div class="flex gap-2 flex-wrap">
                    {#each projects as p (p.id)}
                        <button
                                onclick={() => onProjectChange(p.id)}
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
                    <p class="text-xs text-muted-foreground mt-1">
                        Network: <span class="font-mono">{selectedProject.network_name}</span>
                    </p>
                {/if}
            {/if}
        </div>

        <!-- Expose toggle -->
        <button
                onclick={onExposeToggle}
                class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all {expose
				? 'border-primary bg-primary/5'
				: 'border-border hover:border-primary/40'}"
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
                                    onchange={(v) => onFieldChange(f.key, String(v))}
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
                                    value={fields[f.key]}
                                    oninput={(e) => onFieldChange(f.key, (e.target as HTMLInputElement).value)}
                                    class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                            />
                        </div>
                    {/if}
                {/each}
            </div>
        {/if}

        <!-- Other fields -->
        {#each otherFields as f (f.key)}
            {#if f.type === "boolean"}
                <button
                        onclick={() => onFieldChange(f.key, fields[f.key] === "true" ? "false" : "true")}
                        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all {fields[f.key] === 'true'
						? 'border-primary bg-primary/5'
						: 'border-border hover:border-primary/40'}"
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
                            value={fields[f.key]}
                            onchange={(e) => onFieldChange(f.key, (e.target as HTMLSelectElement).value)}
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
                            value={fields[f.key]}
                            oninput={(e) => onFieldChange(f.key, (e.target as HTMLInputElement).value)}
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
        <Button variant="outline" onclick={onBack}>Back</Button>
        <Button disabled={!isValid} onclick={onDeploy}>Deploy {selected.name}</Button>
    </div>
</div>