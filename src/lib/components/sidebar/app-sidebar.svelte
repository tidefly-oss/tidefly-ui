<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { projectsStore } from "$lib/stores/projects.svelte.js";
  import { systemInfoStore as systemStore } from "$lib/stores/system.info.svelte.js";
  import { auth } from "$lib/stores/auth.svelte";
  import { GitBranchIcon, LayoutTemplate } from "@lucide/svelte";
  import TideflyMascot from "$lib/assets/tidefly_mascot_icon.svg";

  import ActivityIcon from "@lucide/svelte/icons/activity";
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
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import UsersIcon from "@lucide/svelte/icons/users";
  import ZapIcon from "@lucide/svelte/icons/zap";
  import type { ComponentProps } from "svelte";
  import { onDestroy, onMount } from "svelte";

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props();

  onDestroy(() => systemStore.stopPolling());

  let activeProjectId = $state<string | null>(null);

  const isAdmin = $derived(auth.user?.role === "admin");

  const visibleProjects = $derived(
          isAdmin
                  ? projectsStore.projects
                  : projectsStore.projects.filter((p) => auth.projectIds.includes(p.id)),
  );

  const activeProject = $derived(
          visibleProjects.find((p) => p.id === activeProjectId) ??
          visibleProjects[0] ??
          null,
  );

  $effect(() => {
    if (!auth.user) return;
    projectsStore.load();
    systemStore.load();
    systemStore.startPolling(60_000);
  });

  $effect(() => {
    const match = page.url.pathname.match(/\/dashboard\/projects\/([^/]+)/);
    if (match && match[1] !== "new") {
      activeProjectId = match[1];
    }
  });

  const navGroups = $derived([
    {
      label: "Overview",
      items: [
        { title: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
      ],
    },
    {
      label: "Source",
      items: [
        { title: "Git Integrations", href: "/dashboard/git/",      icon: GitBranchIcon },
        { title: "Webhooks",         href: "/dashboard/webhooks",  icon: ZapIcon },
      ],
    },
    {
      label: "Resources",
      items: [
        { title: "Containers",  href: "/dashboard/containers", icon: ContainerIcon },
        { title: "Images",      href: "/dashboard/images",     icon: ImageIcon },
        { title: "Volumes",     href: "/dashboard/volumes",    icon: BoxIcon },
        { title: "Networks",    href: "/dashboard/networks",   icon: NetworkIcon },
      ],
    },
    {
      label: "Services",
      items: [
        { title: "Deployed",   href: "/dashboard/services",           icon: DatabaseIcon },
        { title: "Templates",  href: "/dashboard/services/templates", icon: LayoutTemplate },
      ],
    },
    {
      label: "Observability",
      items: [
        { title: "Monitoring", href: "/dashboard/monitoring", icon: ActivityIcon },
      ],
    },
    ...(isAdmin
            ? [
              {
                label: "Administration",
                items: [
                  { title: "Users",    href: "/dashboard/users",    icon: UsersIcon },
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
          {#if projectsStore.loading && visibleProjects.length === 0}
            <div class="flex items-center gap-2 px-2 py-2">
              <Loader2Icon class="size-3 animate-spin text-muted-foreground" />
              <span class="text-xs text-muted-foreground">Loading projects…</span>
            </div>
          {:else if visibleProjects.length === 0}
            <div class="px-2 py-2 space-y-1.5">
              <p class="text-xs text-muted-foreground">No projects assigned</p>
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
                    <div class="flex items-center gap-2 flex-1 min-w-0">
                      <CircleIcon
                              class="size-2 shrink-0 fill-current"
                              style="color: {activeProject?.color ?? '#6b7280'}"
                      />
                      <span class="truncate font-medium">{activeProject?.name ?? "—"}</span>
                    </div>
                    <ChevronDownIcon class="size-4 opacity-50" />
                  </Sidebar.MenuButton>
                {/snippet}
              </DropdownMenu.Trigger>
              <DropdownMenu.Content class="w-56" align="start">
                <DropdownMenu.Label class="text-xs text-muted-foreground">
                  Switch Project
                </DropdownMenu.Label>
                <DropdownMenu.Separator />
                {#each visibleProjects as project (project.id)}
                  <DropdownMenu.Item
                          onclick={() => {
                      activeProjectId = project.id;
                      goto(`/dashboard/projects/${project.id}`);
                    }}
                          class={activeProject?.id === project.id ? "bg-accent" : ""}
                  >
                    <CircleIcon
                            class="size-2 fill-current mr-2 shrink-0"
                            style="color: {project.color}"
                    />
                    <span class="flex-1 truncate">{project.name}</span>
                    {#if project.network_name}
                      <span class="text-xs text-muted-foreground font-mono truncate max-w-20">
                        {project.network_name}
                      </span>
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
  <!-- Sidebar Footer -->
  <Sidebar.Footer>
    <div class="px-3 py-3 flex items-center justify-center">
        <span class="text-xs text-muted-foreground font-mono">
            v{systemStore.version}
        </span>
    </div>
  </Sidebar.Footer>
</Sidebar.Root>