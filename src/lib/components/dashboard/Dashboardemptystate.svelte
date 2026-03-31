<script lang="ts">
import { CodeIcon, DatabaseIcon, GitBranchIcon, LayersIcon, ServerIcon } from "@lucide/svelte";

const quickActions = [
	{
		icon: DatabaseIcon,
		title: "Deploy a Service",
		description: "Redis, Postgres, and more — one click.",
		href: "/dashboard/services/templates",
		accent: "bg-blue-500/10 text-blue-500",
		primary: true,
	},
	{
		icon: CodeIcon,
		title: "Deploy from Dockerfile",
		description: "Build and run your own container.",
		href: "/dashboard/containers?action=dockerfile",
		accent: "bg-violet-500/10 text-violet-500",
		primary: false,
	},
	{
		icon: LayersIcon,
		title: "Deploy Compose",
		description: "Bring a docker-compose.yml file.",
		href: "/dashboard/containers?action=compose",
		accent: "bg-orange-500/10 text-orange-500",
		primary: false,
	},
	{
		icon: GitBranchIcon,
		title: "Connect Git",
		description: "Link GitHub, GitLab or Gitea.",
		href: "/dashboard/git",
		accent: "bg-green-500/10 text-green-500",
		primary: false,
	},
];
</script>

<div class="bg-card border rounded-xl p-8">
    <div class="max-w-lg">
        <div class="flex items-center gap-2.5 mb-1">
            <ServerIcon class="size-4 text-muted-foreground" />
            <span class="text-sm font-medium text-muted-foreground">Getting started</span>
        </div>
        <h2 class="text-xl font-semibold mt-2 mb-1">Nothing deployed yet</h2>
        <p class="text-sm text-muted-foreground mb-6">
            Deploy a service, run a container from a Dockerfile, or connect a Git repository to get started.
        </p>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {#each quickActions as action}
                <a
                        href={action.href}
                        class="flex items-start gap-3 rounded-lg border p-3.5 hover:border-primary/40 hover:bg-muted/30 transition-all group {action.primary ? 'border-primary/20 bg-primary/5' : ''}"
                >
                    <div class="rounded-lg p-2 shrink-0 {action.accent}">
                        <action.icon class="size-4" />
                    </div>
                    <div class="min-w-0">
                        <div class="text-sm font-medium group-hover:text-primary transition-colors">
                            {action.title}
                        </div>
                        <div class="text-xs text-muted-foreground mt-0.5">
                            {action.description}
                        </div>
                    </div>
                </a>
            {/each}
        </div>
    </div>
</div>