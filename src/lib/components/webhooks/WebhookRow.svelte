<script lang="ts">
import {
	CheckIcon,
	ChevronDownIcon,
	ClipboardIcon,
	KeyRoundIcon,
	RefreshCwIcon,
	Trash2Icon,
	XIcon,
	ZapIcon,
} from "@lucide/svelte";
import type { Webhook, WebhookDelivery, WebhookStatus } from "$lib/api/v1/types/webhooks.js";
import { Badge } from "$lib/components/ui/badge/index.js";
import { Button } from "$lib/components/ui/button/index.js";
import * as Collapsible from "$lib/components/ui/collapsible/index.js";

let {
	webhook,
	ondelete,
	onrotate,
	onloaddeliveries,
}: {
	webhook: Webhook;
	ondelete: (id: string) => Promise<void>;
	onrotate: (id: string) => Promise<{ secret: string }>;
	onloaddeliveries: (id: string) => Promise<WebhookDelivery[]>;
} = $props();

let deliveriesOpen = $state(false);
let deliveries = $state<WebhookDelivery[]>([]);
let loadingDel = $state(false);
let deleting = $state(false);
let rotating = $state(false);
let newSecret = $state<string | null>(null);
let copied = $state(false);

async function toggleDeliveries() {
	deliveriesOpen = !deliveriesOpen;
	if (deliveriesOpen && deliveries.length === 0) {
		loadingDel = true;
		try {
			deliveries = await onloaddeliveries(webhook.id);
		} finally {
			loadingDel = false;
		}
	}
}

async function copyUrl() {
	await navigator.clipboard.writeText(webhook.url);
	copied = true;
	setTimeout(() => (copied = false), 2000);
}

async function rotate() {
	if (!confirm("Rotate webhook secret? You must update your Git provider immediately.")) return;
	rotating = true;
	newSecret = null;
	try {
		newSecret = (await onrotate(webhook.id)).secret;
	} finally {
		rotating = false;
	}
}

async function del() {
	if (!confirm(`Delete webhook "${webhook.name}"?`)) return;
	deleting = true;
	try {
		await ondelete(webhook.id);
	} finally {
		deleting = false;
	}
}

function statusColor(s?: WebhookStatus) {
	if (s === "success") return "text-green-500";
	if (s === "failed") return "text-destructive";
	return "text-muted-foreground";
}

function formatDate(iso?: string) {
	if (!iso) return "—";
	return new Date(iso).toLocaleString("de-DE", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
</script>

<div class="rounded-lg border bg-card p-4 space-y-3">
    <!-- Header -->
    <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
            <ZapIcon class="size-4 shrink-0 text-muted-foreground" />
            <span class="font-medium truncate">{webhook.name}</span>
            {#if !webhook.active}
                <Badge variant="secondary">Disabled</Badge>
            {/if}
            <Badge variant="outline" class="text-xs">{webhook.provider}</Badge>
            <Badge variant="outline" class="text-xs">{webhook.trigger_type}</Badge>
            {#if webhook.branch}
                <Badge variant="outline" class="text-xs font-mono">{webhook.branch}</Badge>
            {/if}
        </div>

        <div class="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" onclick={rotate} disabled={rotating} title="Rotate secret">
                <KeyRoundIcon class="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onclick={del} disabled={deleting} title="Delete">
                <Trash2Icon class="size-4 text-destructive" />
            </Button>
        </div>
    </div>

    <!-- URL -->
    <div class="flex items-center gap-2">
        <code class="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1">
            {webhook.url}
        </code>
        <Button variant="ghost" size="icon" onclick={copyUrl} title="Copy URL">
            {#if copied}
                <CheckIcon class="size-4 text-green-500" />
            {:else}
                <ClipboardIcon class="size-4" />
            {/if}
        </Button>
    </div>

    <!-- New secret after rotate -->
    {#if newSecret}
        <div class="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 space-y-1">
            <p class="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                New secret — copy it now, it won't be shown again
            </p>
            <code class="text-xs font-mono break-all">{newSecret}</code>
        </div>
    {/if}

    <!-- Stats -->
    <div class="flex items-center gap-4 text-xs text-muted-foreground">
    <span class={statusColor(webhook.last_status)}>
      {#if webhook.last_status === 'success'}
        <CheckIcon class="size-3 inline mr-1" />
      {:else if webhook.last_status === 'failed'}
        <XIcon class="size-3 inline mr-1" />
      {/if}
        {webhook.last_status ?? 'never triggered'}
    </span>
        <span>{formatDate(webhook.last_triggered_at)}</span>
        <span>{webhook.trigger_count} triggers</span>
    </div>

    <!-- Deliveries collapsible -->
    <Collapsible.Root open={deliveriesOpen}>
        <Collapsible.Trigger>
            <Button variant="ghost" size="sm" class="w-full justify-between h-7 text-xs" onclick={toggleDeliveries}>
                Delivery history
                <ChevronDownIcon class="size-3 transition-transform {deliveriesOpen ? 'rotate-180' : ''}" />
            </Button>
        </Collapsible.Trigger>
        <Collapsible.Content>
            {#if loadingDel}
                <div class="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                    <RefreshCwIcon class="size-3 animate-spin" /> Loading...
                </div>
            {:else if deliveries.length === 0}
                <p class="text-xs text-muted-foreground py-3">No deliveries yet.</p>
            {:else}
                <div class="mt-2 space-y-1">
                    {#each deliveries as d (d.id)}
                        <div class="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                            <div class="flex items-center gap-2 min-w-0">
                <span class={statusColor(d.status)}>
                  {#if d.status === 'success'}
                    <CheckIcon class="size-3 inline" />
                  {:else if d.status === 'failed'}
                    <XIcon class="size-3 inline" />
                  {:else}
                    <RefreshCwIcon class="size-3 inline" />
                  {/if}
                </span>
                                <span class="font-mono truncate">{d.commit.slice(0, 7)}</span>
                                <span class="truncate text-muted-foreground">{d.branch}</span>
                                <span class="truncate text-muted-foreground">{d.commit_msg}</span>
                            </div>
                            <div class="flex items-center gap-2 shrink-0 text-muted-foreground">
                                <span>{d.duration_ms}ms</span>
                                <span>{formatDate(d.created_at)}</span>
                            </div>
                        </div>
                        {#if d.error_msg}
                            <p class="text-xs text-destructive pl-5 pb-1">{d.error_msg}</p>
                        {/if}
                    {/each}
                </div>
            {/if}
        </Collapsible.Content>
    </Collapsible.Root>
</div>