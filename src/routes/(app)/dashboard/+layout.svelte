<script lang="ts">
  import { goto } from "$app/navigation";
  import AppSidebar from "$lib/components/sidebar/app-sidebar.svelte";
  import NotificationBell from "$lib/components/notifications/NotificationBell.svelte";
  import { Avatar, AvatarFallback } from "$lib/components/ui/avatar/index.js";
  import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import { initQueryClient } from "$lib/query";
  import { auth } from "$lib/stores/auth.svelte";
  import { getBreadcrumb } from "$lib/stores/breadcrumb.svelte";
  import { dockerEventsStore } from "$lib/stores/events.svelte";
  import { theme } from "$lib/stores/theme.svelte";
  import LogOutIcon from "@lucide/svelte/icons/log-out";
  import MonitorIcon from "@lucide/svelte/icons/monitor";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import SunIcon from "@lucide/svelte/icons/sun";
  import UserIcon from "@lucide/svelte/icons/user";
  import { QueryClientProvider } from "@tanstack/svelte-query";
  import type { Snippet } from "svelte";
  import { onDestroy, onMount } from "svelte";
  import type { User } from "$lib/api/v1/types";

  let { children, data }: { children: Snippet, data: { user: User } } = $props();

  const queryClient = initQueryClient();

  onMount(() => {
    auth.setUser(data.user);
    theme.init();
    dockerEventsStore.connect();
  });

  onDestroy(() => {
    dockerEventsStore.disconnect();
  });

  async function handleLogout() {
    await auth.logout();
    await goto("/login");
  }

  function getUserInitials(user: User | null | undefined) {
    const name = user?.name ?? user?.email ?? "U";
    return name
            .split(" ")
            .map((n: string) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
  }
</script>

<QueryClientProvider client={queryClient}>
  <Sidebar.Provider style="--sidebar-width: 19rem;">
    <AppSidebar />
    <Sidebar.Inset class="min-h-screen">
      <header class="flex h-16 shrink-0 items-center gap-2 px-4">
        <Breadcrumb.Root>
          <Breadcrumb.List>
            {#each getBreadcrumb() as item, i (item.href)}
              <Breadcrumb.Item>
                {#if item.href}
                  <Breadcrumb.Link href={item.href}>{item.label}</Breadcrumb.Link>
                {:else}
                  <Breadcrumb.Page>{item.label}</Breadcrumb.Page>
                {/if}
                {#if i < getBreadcrumb().length - 1}
                  <Breadcrumb.Separator class="hidden md:block" />
                {/if}
              </Breadcrumb.Item>
            {/each}
          </Breadcrumb.List>
        </Breadcrumb.Root>

        <div class="ml-auto flex items-center gap-2">
          <NotificationBell />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              {#snippet child({ props })}
                <Button
                        variant="ghost"
                        size="icon"
                        class="rounded-full cursor-pointer focus-visible:ring-0 focus-visible:ring-offset-0"
                        {...props}
                >
                  <Avatar class="size-8">
                    <AvatarFallback class="text-xs">{getUserInitials(data.user)}</AvatarFallback>
                  </Avatar>
                </Button>
              {/snippet}
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end" class="w-56">
              <div class="px-3 py-2">
                <p class="text-sm font-medium">{data.user?.name ?? ""}</p>
                <p class="text-muted-foreground truncate text-xs">{data.user?.email ?? ""}</p>
              </div>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => goto("/dashboard/settings/profile")}>
                <UserIcon class="mr-2 size-4" /> Profile
              </DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Label class="text-muted-foreground px-3 py-1 text-xs font-normal">Theme</DropdownMenu.Label>
              <DropdownMenu.Item onclick={() => theme.set("light")}><SunIcon class="mr-2 size-4" /> Light</DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => theme.set("dark")}><MoonIcon class="mr-2 size-4" /> Dark</DropdownMenu.Item>
              <DropdownMenu.Item onclick={() => theme.set("system")}><MonitorIcon class="mr-2 size-4" /> System</DropdownMenu.Item>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onclick={handleLogout} class="text-destructive focus:text-destructive">
                <LogOutIcon class="mr-2 size-4" /> Logout
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </header>
      <main class="p-6">
        {@render children()}
      </main>
    </Sidebar.Inset>
  </Sidebar.Provider>
</QueryClientProvider>