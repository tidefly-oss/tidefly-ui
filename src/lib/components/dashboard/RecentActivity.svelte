<script lang="ts">
import { ChevronRightIcon, CircleAlert, CircleIcon } from "@lucide/svelte";
import type { Notification } from "$lib/api/v1/types";

interface Props {
	notifications: Notification[];
}

const { notifications }: Props = $props();

const unreadCount = $derived(notifications.filter((n) => !n.acknowledged_at).length);

function severityColor(severity: string) {
	if (severity === "FATAL" || severity === "ERROR") return "text-destructive";
	if (severity === "WARN") return "text-amber-500";
	return "text-muted-foreground";
}

function severityDot(severity: string) {
	if (severity === "FATAL" || severity === "ERROR") return "#ef4444";
	if (severity === "WARN") return "#f59e0b";
	return "#6b7280";
}

function timeAgo(dateStr: string) {
	const diff = Date.now() - new Date(dateStr).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	return `${Math.floor(hrs / 24)}d ago`;
}
</script>

{#if notifications.length > 0}
    <div class="bg-card border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3.5 border-b">
            <div class="flex items-center gap-2">
                <h2 class="font-medium text-sm">Recent Activity</h2>
                {#if unreadCount > 0}
					<span
                            class="text-xs text-destructive bg-destructive/10 rounded-full px-2 py-0.5 flex items-center gap-1"
                    >
						<CircleAlert class="size-3" />
                        {unreadCount} unread
					</span>
                {/if}
            </div>
            <a
                    href="/dashboard/monitoring"
                    class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
                View all <ChevronRightIcon class="size-3" />
            </a>
        </div>
        <div class="divide-y">
            {#each notifications as n (n.id)}
                <div
                        class="px-5 py-3 flex items-start gap-3 {!n.acknowledged_at ? 'bg-muted/20' : ''}"
                >
                    <div class="mt-1 shrink-0">
                        <CircleIcon
                                class="size-1.5 fill-current {severityColor(n.severity)}"
                                style="color: {severityDot(n.severity)}"
                        />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 min-w-0">
							<span
                                    class="text-xs font-medium truncate {!n.acknowledged_at
									? ''
									: 'text-muted-foreground'}"
                            >
								{n.container_name || "system"}
							</span>
                            <span class="text-xs text-muted-foreground shrink-0">{timeAgo(n.updated_at)}</span>
                        </div>
                        <p class="text-xs text-muted-foreground truncate mt-0.5">{n.message}</p>
                    </div>
                    {#if n.occurrence_count > 1}
						<span
                                class="text-xs text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 shrink-0 tabular-nums"
                        >
							×{n.occurrence_count}
						</span>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
{/if}