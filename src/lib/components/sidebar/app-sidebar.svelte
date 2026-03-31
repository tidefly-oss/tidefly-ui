<script lang="ts">
import { DatabaseBackupIcon, GitBranchIcon, LayoutTemplate } from "@lucide/svelte";
import ActivityIcon from "@lucide/svelte/icons/activity";
import ArrowUpCircleIcon from "@lucide/svelte/icons/arrow-up-circle";
import BoxIcon from "@lucide/svelte/icons/box";
import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
import CircleIcon from "@lucide/svelte/icons/circle";
import ContainerIcon from "@lucide/svelte/icons/container";
import DatabaseIcon from "@lucide/svelte/icons/database";
import FolderIcon from "@lucide/svelte/icons/folder";
import ImageIcon from "@lucide/svelte/icons/image";
import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
import Loader2Icon from "@lucide/svelte/icons/loader-2";
import NetworkIcon from "@lucide/svelte/icons/network";
import PlusIcon from "@lucide/svelte/icons/plus";
import ServerIcon from "@lucide/svelte/icons/server";
import SettingsIcon from "@lucide/svelte/icons/settings";
import UsersIcon from "@lucide/svelte/icons/users";
import ZapIcon from "@lucide/svelte/icons/zap";
import { createQuery } from "@tanstack/svelte-query";
import type { ComponentProps } from "svelte";
import { onDestroy } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { systemApi } from "$lib/api/v1/system";
import TideflyMascot from "$lib/assets/tidefly_mascot_icon.svg";
import UpdateDialog from "$lib/components/sidebar/UpdateDialog.svelte";
import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
import type * as Sidebar from "$lib/components/ui/sidebar/index.js";
import * as Tooltip from "$lib/components/ui/tooltip/index.js";
import { projectQueries } from "$lib/queries/projects.js";
import { auth } from "$lib/stores/auth.svelte";
import { updateStore } from "$lib/stores/update.svelte.js";

let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

let updateDialogOpen = $state(false);

// ── System info ───────────────────────────────────────────────────────────
const systemQuery = createQuery(() => ({
	queryKey: ["system-info"],
	queryFn: () => systemApi.info(),
	refetchInterval: 60_000,
	staleTime: 30_000,
}));

const version = $derived(systemQuery.data?.tidefly_version ?? "dev");

$effect(() => {
	if (version && version !== "dev") updateStore.startPolling(version);
});
onDestroy(() => updateStore.stopPolling());

// ── Projects ──────────────────────────────────────────────────────────────
const projectsQuery = createQuery(() => ({
	...projectQueries.list(),
	enabled: !!auth.user,
}));

const isAdmin = $derived(auth.user?.role === "admin");
const allProjects = $derived(projectsQuery.data ?? []);
const visibleProjects = $derived(
	isAdmin ? allProjects : allProjects.filter((p) => auth.projectIds.includes(p.id))
);

let activeProjectId = $state<string | null>(null);
const activeProject = $derived(
	visibleProjects.find((p) => p.id === activeProjectId) ?? visibleProjects[0] ?? null
);

$effect(() => {
	const match = page.url.pathname.match(/\/dashboard\/projects\/([^/]+)/);
	if (match && match[1] !== "new") activeProjectId = match[1];
});

// ── Nav ───────────────────────────────────────────────────────────────────
const navGroups = $derived([
	{
		label: "Overview",
		items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon }],
	},
	{
		label: "Source",
		items: [
			{ title: "Git Integrations", href: "/dashboard/git/", icon: GitBranchIcon },
			{ title: "Webhooks", href: "/dashboard/webhooks", icon: ZapIcon },
		],
	},
	{
		label: "Resources",
		items: [
			{ title: "Containers", href: "/dashboard/containers", icon: ContainerIcon },
			{ title: "Images", href: "/dashboard/images", icon: ImageIcon },
			{ title: "Volumes", href: "/dashboard/volumes", icon: BoxIcon },
			{ title: "Networks", href: "/dashboard/networks", icon: NetworkIcon },
		],
	},
	{
		label: "Services",
		items: [
			{ title: "Deployed", href: "/dashboard/services", icon: DatabaseIcon },
			{ title: "Templates", href: "/dashboard/services/templates", icon: LayoutTemplate },
		],
	},
	{
		label: "Observability",
		items: [{ title: "Monitoring", href: "/dashboard/monitoring", icon: ActivityIcon }],
	},
	...(isAdmin
		? [
				{
					label: "Infrastructure",
					items: [{ title: "Servers", href: "/dashboard/servers", icon: ServerIcon }],
				},
				{
					label: "Administration",
					items: [
						{ title: "Backups", href: "/dashboard/backups", icon: DatabaseBackupIcon },
						{ title: "Users", href: "/dashboard/users", icon: UsersIcon },
						{ title: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
					],
				},
			]
		: []),
]);

function isActive(href: string) {
	if (href === "/dashboard") return page.url.pathname === href;
	if (href === "/dashboard/services") return page.url.pathname === href;
	return page.url.pathname.startsWith(href);
}
</script>

<Sidebar.Root variant="floating" {...restProps}>
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg">
                    {#snippet child({ props })}
                        <a href="/dashboard" {...props}>
                            <div class="flex items-center justify-center size-10 rounded-full bg-[#1B1D30] shrink-0">
                                <img src={TideflyMascot} alt="Tidefly" class="size-7 object-contain" />
                            </div>
                            <span class="font-semibold tracking-tight">Tidefly</span>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>

    <Sidebar.Content>
        <!-- Project Switcher -->
        <Sidebar.Group>
            <Sidebar.GroupLabel class="text-xs font-medium uppercase tracking-wider opacity-50">
                Project
            </Sidebar.GroupLabel>
            <Sidebar.Menu>
                <Sidebar.MenuItem>
                    {#if projectsQuery.isPending}
                        <div class="flex items-center gap-2 px-2 py-2">
                            <Loader2Icon class="size-3 animate-spin text-muted-foreground" />
                            <span class="text-xs text-muted-foreground">Loading projects…</span>
                        </div>
                    {:else if visibleProjects.length === 0}
                        <div class="px-2 py-2 space-y-1.5">
                            <p class="text-xs text-muted-foreground">No projects assigned</p>
                            {#if isAdmin}
                                <a href="/dashboard/projects/new" class="flex items-center gap-1.5 text-xs text-primary hover:underline">
                                    <PlusIcon class="size-3" /> New project
                                </a>
                            {/if}
                        </div>
                    {:else}
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger>
                                {#snippet child({ props })}
                                    <Sidebar.MenuButton
                                            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground h-10 cursor-pointer"
                                            {...props}
                                    >
                                        <div class="flex items-center gap-2 flex-1 min-w-0">
                                            <CircleIcon class="size-2 shrink-0 fill-current" style="color: {activeProject?.color ?? '#6b7280'}" />
                                            <span class="truncate font-medium">{activeProject?.name ?? "—"}</span>
                                        </div>
                                        <ChevronDownIcon class="size-4 opacity-50" />
                                    </Sidebar.MenuButton>
                                {/snippet}
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content class="w-56" align="start">
                                <DropdownMenu.Label class="text-xs text-muted-foreground">Switch Project</DropdownMenu.Label>
                                <DropdownMenu.Separator />
                                {#each visibleProjects as project (project.id)}
                                    <DropdownMenu.Item
                                            onclick={() => { activeProjectId = project.id; goto(`/dashboard/projects/${project.id}`); }}
                                            class={activeProject?.id === project.id ? "bg-accent" : ""}
                                    >
                                        <CircleIcon class="size-2 fill-current mr-2 shrink-0" style="color: {project.color}" />
                                        <span class="flex-1 truncate">{project.name}</span>
                                        {#if project.network_name}
                                            <span class="text-xs text-muted-foreground font-mono truncate max-w-20">{project.network_name}</span>
                                        {/if}
                                    </DropdownMenu.Item>
                                {/each}
                                <DropdownMenu.Separator />
                                {#if isAdmin}
                                    <DropdownMenu.Item onclick={() => goto("/dashboard/projects/new")}>
                                        <PlusIcon class="size-4 mr-2" /> New Project
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item onclick={() => goto("/dashboard/projects")}>
                                        <FolderIcon class="size-4 mr-2" /> All Projects
                                    </DropdownMenu.Item>
                                {/if}
                            </DropdownMenu.Content>
                        </DropdownMenu.Root>
                    {/if}
                </Sidebar.MenuItem>
            </Sidebar.Menu>
        </Sidebar.Group>

        <!-- Nav Groups -->
        {#each navGroups as group (group.label)}
            <Sidebar.Group>
                <Sidebar.GroupLabel class="text-xs font-medium uppercase tracking-wider opacity-50">
                    {group.label}
                </Sidebar.GroupLabel>
                <Sidebar.Menu>
                    {#each group.items as item (item.href)}
                        <Sidebar.MenuItem>
                            <Sidebar.MenuButton isActive={isActive(item.href)}>
                                {#snippet child({ props })}
                                    <a href={item.href} {...props}>
                                        <item.icon class="size-4" />
                                        <span>{item.title}</span>
                                    </a>
                                {/snippet}
                            </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                    {/each}
                </Sidebar.Menu>
            </Sidebar.Group>
        {/each}
    </Sidebar.Content>

    <Sidebar.Footer>
        <div class="px-3 py-3 space-y-2">

            <!-- Update banner — klickbar, öffnet Dialog -->
            {#if updateStore.hasUpdate && updateStore.update}
                <button
                        onclick={() => (updateDialogOpen = true)}
                        class="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/15 border border-primary/20 transition-colors group text-left"
                >
                    <ArrowUpCircleIcon class="size-4 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-medium text-primary leading-tight">Update available</p>
                        <p class="text-xs text-primary/70 font-mono leading-tight truncate">
                            {updateStore.update.current} → {updateStore.update.latest}
                        </p>
                    </div>
                    <ArrowUpCircleIcon class="size-3 text-primary/50 shrink-0" />
                </button>
            {/if}

            <!-- Version — klickbar wenn Update verfügbar, sonst plain text -->
            <div class="flex items-center justify-center">
                {#if systemQuery.isPending}
          <span class="text-xs text-muted-foreground font-mono">
            <Loader2Icon class="size-3 animate-spin inline" />
          </span>
                {:else if updateStore.hasUpdate}
                    <Tooltip.Provider delayDuration={200}>
                        <Tooltip.Root>
                            <Tooltip.Trigger>
                                <button
                                        onclick={() => (updateDialogOpen = true)}
                                        class="text-xs font-mono text-primary hover:underline flex items-center gap-1 group"
                                >
                                    v{version}
                                    <span class="size-1.5 rounded-full bg-primary animate-pulse"></span>
                                </button>
                            </Tooltip.Trigger>
                            <Tooltip.Content side="top" class="text-xs">
                                {updateStore.update?.latest} is available — click to see what's new
                            </Tooltip.Content>
                        </Tooltip.Root>
                    </Tooltip.Provider>
                {:else}
                    <span class="text-xs text-muted-foreground font-mono">v{version}</span>
                {/if}
            </div>

        </div>
    </Sidebar.Footer>
</Sidebar.Root>

<UpdateDialog bind:open={updateDialogOpen} />