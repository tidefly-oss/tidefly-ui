<script lang="ts">
import {
	ActivityIcon,
	ArrowUp,
	BoxIcon,
	ChevronDownIcon,
	CircleIcon,
	ContainerIcon,
	DatabaseBackupIcon,
	DatabaseIcon,
	FolderIcon,
	GitBranchIcon,
	ImageIcon,
	LayoutDashboardIcon,
	LoaderCircle,
	NetworkIcon,
	PlusIcon,
	ServerIcon,
	SettingsIcon,
	UsersIcon,
	ZapIcon,
} from "@lucide/svelte";
import { createQuery } from "@tanstack/svelte-query";
import type { ComponentProps } from "svelte";
import { onDestroy } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { adminApi } from "$lib/api/v1/admin";
import { systemApi } from "$lib/api/v1/system";
import TideflyMascot from "$lib/assets/tidefly_mascot_icon.svg";
import UpdateDialog from "$lib/components/sidebar/UpdateDialog.svelte";
import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
import * as Sidebar from "$lib/components/ui/sidebar/index.js";
import { projectQueries } from "$lib/queries/projects.js";
import { auth } from "$lib/stores/auth.svelte";
import { updateStore } from "$lib/stores/update.svelte.js";

const { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

const updateDialogOpen = $state(false);

// ── System info ───────────────────────────────────────────────────────────
const systemQuery = createQuery(() => ({
	queryKey: ["system-info"],
	queryFn: () => systemApi.info(),
	refetchInterval: 60_000,
	staleTime: 30_000,
}));

const version = $derived(systemQuery.data?.tidefly_version ?? "dev");

const settingsQuery = createQuery(() => ({
	queryKey: ["admin-settings"],
	queryFn: () => adminApi.getSettings(),
	staleTime: 60_000,
	enabled: !!auth.user,
}));

const instanceName = $derived(settingsQuery.data?.instance_name ?? "Tidefly");

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
		items: [
			{
				title: "Dashboard",
				href: "/dashboard",
				icon: LayoutDashboardIcon,
			},
		],
	},
	{
		label: "Source",
		items: [
			{
				title: "Git Integrations",
				href: "/dashboard/git/",
				icon: GitBranchIcon,
			},
			{
				title: "Webhooks",
				href: "/dashboard/webhooks",
				icon: ZapIcon,
			},
		],
	},
	{
		label: "Resources",
		items: [
			{
				title: "Containers",
				href: "/dashboard/containers",
				icon: ContainerIcon,
			},
			{
				title: "Templates",
				href: "/dashboard/containers/templates",
				icon: DatabaseIcon,
			},
			{ title: "Images", href: "/dashboard/images", icon: ImageIcon },
			{ title: "Volumes", href: "/dashboard/volumes", icon: BoxIcon },
			{
				title: "Networks",
				href: "/dashboard/networks",
				icon: NetworkIcon,
			},
		],
	},
	{
		label: "Observability",
		items: [
			{
				title: "Monitoring",
				href: "/dashboard/monitoring",
				icon: ActivityIcon,
			},
		],
	},
	...(isAdmin
		? [
				{
					label: "Infrastructure",
					items: [
						{
							title: "Servers",
							href: "/dashboard/servers",
							icon: ServerIcon,
						},
					],
				},
				{
					label: "Administration",
					items: [
						{
							title: "Backups",
							href: "/dashboard/backups",
							icon: DatabaseBackupIcon,
						},
						{
							title: "Users",
							href: "/dashboard/users",
							icon: UsersIcon,
						},
						{
							title: "Settings",
							href: "/dashboard/settings",
							icon: SettingsIcon,
						},
					],
				},
			]
		: []),
]);

function isActive(href: string) {
	if (href === "/dashboard") return page.url.pathname === href;
	if (href === "/dashboard/containers") {
		return (
			page.url.pathname === href ||
			(page.url.pathname.startsWith(href) &&
				!page.url.pathname.startsWith("/dashboard/containers/templates"))
		);
	}
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
                            <div
                                class="flex items-center justify-center size-10 rounded-full bg-[#1B1D30] shrink-0"
                            >
                                <img
                                    src={TideflyMascot}
                                    alt="Tidefly"
                                    class="size-7 object-contain"
                                />
                            </div>
                            <span class="font-semibold tracking-tight"
                                >{instanceName}</span
                            >
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>

    <Sidebar.Content>
        <!-- Project Switcher -->
        <Sidebar.Group>
            <Sidebar.GroupLabel
                class="text-xs font-medium uppercase tracking-wider opacity-50"
            >
                Project
            </Sidebar.GroupLabel>
            <Sidebar.Menu>
                <Sidebar.MenuItem>
                    {#if projectsQuery.isPending}
                        <div class="flex items-center gap-2 px-2 py-2">
                            <LoaderCircle
                                class="size-3 animate-spin text-muted-foreground"
                            />
                            <span class="text-xs text-muted-foreground"
                                >Loading projects…</span
                            >
                        </div>
                    {:else if visibleProjects.length === 0}
                        <div class="px-2 py-2 space-y-1.5">
                            <p class="text-xs text-muted-foreground">
                                No projects assigned
                            </p>
                            {#if isAdmin}
                                <a
                                    href="/dashboard/projects/new"
                                    class="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                >
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
                                        <div
                                            class="flex items-center gap-2 flex-1 min-w-0"
                                        >
                                            <CircleIcon
                                                class="size-2 shrink-0 fill-current"
                                                style="color: {activeProject?.color ??
                                                    '#6b7280'}"
                                            />
                                            <span class="truncate font-medium"
                                                >{activeProject?.name ??
                                                    "—"}</span
                                            >
                                        </div>
                                        <ChevronDownIcon
                                            class="size-4 opacity-50"
                                        />
                                    </Sidebar.MenuButton>
                                {/snippet}
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Content class="w-56" align="start">
                                <DropdownMenu.Label
                                    class="text-xs text-muted-foreground"
                                    >Switch Project</DropdownMenu.Label
                                >
                                <DropdownMenu.Separator />
                                {#each visibleProjects as project (project.id)}
                                    <DropdownMenu.Item
                                        onclick={() => {
                                            activeProjectId = project.id;
                                            goto(
                                                `/dashboard/projects/${project.id}`,
                                            );
                                        }}
                                        class={activeProject?.id === project.id
                                            ? "bg-accent"
                                            : ""}
                                    >
                                        <CircleIcon
                                            class="size-2 fill-current mr-2 shrink-0"
                                            style="color: {project.color}"
                                        />
                                        <span class="flex-1 truncate"
                                            >{project.name}</span
                                        >
                                        {#if project.network_name}
                                            <span
                                                class="text-xs text-muted-foreground font-mono truncate max-w-20"
                                                >{project.network_name}</span
                                            >
                                        {/if}
                                    </DropdownMenu.Item>
                                {/each}
                                <DropdownMenu.Separator />
                                {#if isAdmin}
                                    <DropdownMenu.Item
                                        onclick={() =>
                                            goto("/dashboard/projects/new")}
                                    >
                                        <PlusIcon class="size-4 mr-2" /> New Project
                                    </DropdownMenu.Item>
                                    <DropdownMenu.Item
                                        onclick={() =>
                                            goto("/dashboard/projects")}
                                    >
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
                <Sidebar.GroupLabel
                    class="text-xs font-medium uppercase tracking-wider opacity-50"
                >
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
        <div class="px-2 py-2">
            {#if updateStore.hasUpdate}
                <button
                    onclick={() => (updateDialogOpen = true)}
                    class="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/25 transition-all group text-left"
                >
                    <ArrowUp
                        class="size-5 text-primary shrink-0 group-hover:scale-110 transition-transform"
                    />
                    <span class="flex-1 min-w-0">
                        <span
                            class="text-xs font-semibold text-primary leading-tight"
                            >Updates available</span
                        >
                        <span class="text-xs text-primary/70 leading-tight">
                            {updateStore.components.filter(
                                (c) => c.update_available,
                            ).length} component(s)
                        </span>
                    </span>
                </button>
            {:else}
                <div class="flex items-center justify-center px-3 py-2">
                    <span class="text-xs font-mono text-muted-foreground/70">
                        {#if systemQuery.isPending}
                            <LoaderCircle class="size-3 animate-spin inline" />
                        {:else}
                            {version}
                        {/if}
                    </span>
                </div>
            {/if}
        </div>
    </Sidebar.Footer>
</Sidebar.Root>

<UpdateDialog bind:open={updateDialogOpen} />
