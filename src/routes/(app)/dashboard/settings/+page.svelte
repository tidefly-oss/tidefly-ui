<script lang="ts">
import { BellIcon, InfoIcon, MailIcon, ShieldIcon, SlidersHorizontalIcon } from "@lucide/svelte";
import type { Component } from "svelte";
import AboutSettings from "$lib/components/settings/AboutSettings.svelte";
import GeneralSettings from "$lib/components/settings/GeneralSettings.svelte";
import NotificationsSettings from "$lib/components/settings/NotificationsSettings.svelte";
import SmtpSettings from "$lib/components/settings/SmtpSettings.svelte";

type Tab = "general" | "smtp" | "security" | "notifications" | "about";

const tabs: { id: Tab; label: string; icon: Component }[] = [
	{ id: "general", label: "General", icon: SlidersHorizontalIcon },
	{ id: "smtp", label: "SMTP", icon: MailIcon },
	{ id: "notifications", label: "Notifications", icon: BellIcon },
	{ id: "about", label: "About", icon: InfoIcon },
];

let activeTab = $state<Tab>("general");
</script>

<div class="space-y-6">
    <div>
        <h1 class="text-xl font-semibold">Settings</h1>
        <p class="text-sm text-muted-foreground mt-0.5">Configure your Tidefly instance</p>
    </div>

    <!-- Horizontal tab bar -->
    <div class="flex gap-1 border-b">
        {#each tabs as tab}
            <button
                    onclick={() => activeTab = tab.id}
                    class="flex items-center gap-2 px-3 py-2 text-sm transition-colors relative
                    {activeTab === tab.id
                        ? 'text-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'}"
            >
                <tab.icon class="size-3.5" />
                {tab.label}
                {#if activeTab === tab.id}
                    <span class="absolute bottom-0 inset-x-0 h-px bg-primary rounded-full"></span>
                {/if}
            </button>
        {/each}
    </div>

    <!-- Content -->
    <div>
        {#if activeTab === 'general'}
            <GeneralSettings />
        {:else if activeTab === 'smtp'}
            <SmtpSettings />
        {:else if activeTab === 'about'}
            <AboutSettings />
        {:else if activeTab === 'notifications'}
            <NotificationsSettings />
        {/if}
    </div>
</div>