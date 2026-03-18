<script lang="ts">
    import * as Dialog from '$lib/components/ui/dialog/index.js';
    import { Button } from '$lib/components/ui/button/index.js';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Label } from '$lib/components/ui/label/index.js';
    import { Badge } from '$lib/components/ui/badge/index.js';
    import * as Select from '$lib/components/ui/select/index.js';
    import type { CreateWebhookRequest, WebhookProvider, WebhookTriggerType, Webhook } from '$lib/api/v1/types/webhooks.js';
    import {
        ArrowLeftIcon,
        ArrowRightIcon,
        CheckIcon,
        ClipboardIcon,
        KeyRoundIcon,
        ShieldCheckIcon,
        ZapIcon,
    } from '@lucide/svelte';

    let { projectId, open = $bindable(false), oncreated }: {
        projectId: string;
        open?: boolean;
        oncreated: (req: CreateWebhookRequest) => Promise<Webhook>;
    } = $props();

    // ── State ──────────────────────────────────────────────────────────────────
    type Step = 1 | 2;
    let step = $state<Step>(1);

    let name        = $state('');
    let triggerType = $state<WebhookTriggerType>('redeploy');
    let provider    = $state<WebhookProvider>('github');
    let branch      = $state('');
    let saving      = $state(false);
    let error       = $state<string | null>(null);

    let createdWebhook = $state<Webhook | null>(null);
    let plainSecret    = $state<string | null>(null);
    let copiedUrl      = $state(false);
    let copiedSecret   = $state(false);
    let guideStep      = $state(0);

    const steps = ['Configure', 'Connect'];
    const step1Valid = $derived(name.trim().length > 0);

    // ── Provider guide steps ───────────────────────────────────────────────────
    const providerSteps: Record<string, string[]> = {
        github: [
            'Go to your repository on GitHub',
            'Open Settings → Webhooks → Add webhook',
            'Paste the Payload URL into the "Payload URL" field',
            'Set Content type to application/json',
            'Paste your secret into the "Secret" field',
            'Choose "Just the push event" or "Send me everything"',
            'Click Add webhook — GitHub will send a ping to verify',
        ],
        gitlab: [
            'Go to your project on GitLab',
            'Open Settings → Webhooks',
            'Paste the Payload URL into the "URL" field',
            'Paste your secret into the "Secret token" field',
            'Check "Push events" under Trigger',
            'Click Add webhook',
        ],
        gitea: [
            'Go to your repository on Gitea',
            'Open Settings → Webhooks → Add Webhook → Gitea',
            'Paste the Payload URL into the "Target URL" field',
            'Set Content type to application/json',
            'Paste your secret into the "Secret" field',
            'Choose "Push Events" under Trigger On',
            'Click Add Webhook',
        ],
        bitbucket: [
            'Go to your repository on Bitbucket',
            'Open Repository settings → Webhooks → Add webhook',
            'Paste the Payload URL into the "URL" field',
            'Check "Repository push" under Triggers',
            'Click Save',
        ],
        generic: [
            'Copy the Payload URL below',
            'Configure your CI/CD or Git provider to POST to this URL',
            'Set Content-Type: application/json',
            'Include X-Hub-Signature-256: sha256=<hmac> header with your secret',
            'Send a JSON body with at least a "ref" or "branch" field',
        ],
    };

    const guideSteps = $derived(providerSteps[provider] ?? providerSteps.github);

    // ── Actions ───────────────────────────────────────────────────────────────
    function reset() {
        step           = 1;
        name           = '';
        triggerType    = 'redeploy';
        provider       = 'github';
        branch         = '';
        error          = null;
        saving         = false;
        createdWebhook = null;
        plainSecret    = null;
        copiedUrl      = false;
        copiedSecret   = false;
        guideStep      = 0;
    }

    async function submit() {
        if (!step1Valid) return;
        saving = true;
        error  = null;
        try {
            const wh = await oncreated({
                name:         name.trim(),
                trigger_type: triggerType,
                provider,
                branch:       branch.trim() || undefined,
            });
            createdWebhook = wh;
            plainSecret    = wh.secret ?? null;
            step = 2;
        } catch (e: any) {
            error = e?.message ?? 'Failed to create webhook';
        } finally {
            saving = false;
        }
    }

    async function copyUrl() {
        if (!createdWebhook?.url) return;
        await navigator.clipboard.writeText(createdWebhook.url);
        copiedUrl = true;
        setTimeout(() => (copiedUrl = false), 2000);
    }

    async function copySecret() {
        if (!plainSecret) return;
        await navigator.clipboard.writeText(plainSecret);
        copiedSecret = true;
        setTimeout(() => (copiedSecret = false), 2000);
    }

    const providerLabel = $derived(
        provider === 'gitea' ? 'Gitea' :
            provider.charAt(0).toUpperCase() + provider.slice(1)
    );
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) reset(); }}>
    <Dialog.Content class="max-w-lg">
        <Dialog.Header>
            <Dialog.Title class="flex items-center gap-2">
                <ZapIcon class="size-4" />
                {step === 1 ? 'Create Webhook' : `Connect to ${providerLabel}`}
            </Dialog.Title>
        </Dialog.Header>

        <!-- Stepper -->
        <div class="flex items-center gap-0 mt-1 mb-5">
            {#each steps as label, i (i)}
                {@const n = (i + 1) as Step}
                {@const isActive = step === n}
                {@const isDone = step > n}
                <div class="flex items-center gap-0 flex-1 last:flex-none">
                    <div class="flex items-center gap-2 shrink-0">
                        <div class="size-6 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-all
                            {isDone
                                ? 'bg-primary border-primary text-primary-foreground'
                                : isActive
                                ? 'border-primary text-primary'
                                : 'border-muted-foreground/30 text-muted-foreground'}">
                            {#if isDone}
                                <CheckIcon class="size-3" />
                            {:else}
                                {n}
                            {/if}
                        </div>
                        <span class="text-xs font-medium
                            {isActive ? 'text-foreground' : isDone ? 'text-primary' : 'text-muted-foreground'}">
                            {label}
                        </span>
                    </div>
                    {#if i < steps.length - 1}
                        <div class="flex-1 h-px mx-3 {step > n ? 'bg-primary' : 'bg-border'}"></div>
                    {/if}
                </div>
            {/each}
        </div>

        <!-- ── Step 1: Configure ─────────────────────────────────────────────── -->
        {#if step === 1}
            <div class="space-y-4">
                <div class="space-y-1.5">
                    <Label for="wh-name">Name <span class="text-destructive">*</span></Label>
                    <Input id="wh-name" bind:value={name} placeholder="e.g. Deploy on push to main" />
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1.5">
                        <Label>Trigger</Label>
                        <Select.Root type="single" bind:value={triggerType}>
                            <Select.Trigger class="w-full">
                                {triggerType === 'redeploy' ? 'Redeploy service' : 'Full deploy'}
                            </Select.Trigger>
                            <Select.Content>
                                <Select.Item value="redeploy">Redeploy service</Select.Item>
                                <Select.Item value="deploy">Full deploy</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>

                    <div class="space-y-1.5">
                        <Label>Git Provider</Label>
                        <Select.Root type="single" bind:value={provider}>
                            <Select.Trigger class="w-full">{providerLabel}</Select.Trigger>
                            <Select.Content>
                                <Select.Item value="github">GitHub</Select.Item>
                                <Select.Item value="gitlab">GitLab</Select.Item>
                                <Select.Item value="gitea">Gitea / Forgejo</Select.Item>
                                <Select.Item value="bitbucket">Bitbucket</Select.Item>
                                <Select.Item value="generic">Generic</Select.Item>
                            </Select.Content>
                        </Select.Root>
                    </div>
                </div>

                <div class="space-y-1.5">
                    <Label for="wh-branch">
                        Branch filter
                        <span class="text-muted-foreground text-xs font-normal ml-1">(optional — empty = all branches)</span>
                    </Label>
                    <Input id="wh-branch" bind:value={branch} placeholder="main" />
                </div>

                {#if error}
                    <p class="text-sm text-destructive">{error}</p>
                {/if}
            </div>

            <Dialog.Footer class="mt-5">
                <Button variant="outline" onclick={() => { open = false; reset(); }}>Cancel</Button>
                <Button onclick={submit} disabled={saving || !step1Valid}>
                    {#if saving}
                        Creating…
                    {:else}
                        Create & Continue <ArrowRightIcon class="size-4 ml-1.5" />
                    {/if}
                </Button>
            </Dialog.Footer>

            <!-- ── Step 2: Connect ───────────────────────────────────────────────── -->
        {:else if step === 2}
            <div class="space-y-4">

                <!-- Payload URL -->
                <div class="space-y-1.5">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">Payload URL</p>
                    <div class="flex items-center gap-2">
                        <code class="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
                            {createdWebhook?.url ?? '—'}
                        </code>
                        <Button variant="outline" size="icon" onclick={copyUrl} title="Copy URL">
                            {#if copiedUrl}
                                <CheckIcon class="size-4 text-green-500" />
                            {:else}
                                <ClipboardIcon class="size-4" />
                            {/if}
                        </Button>
                    </div>
                </div>

                <!-- Secret -->
                {#if plainSecret}
                    <div class="rounded-md bg-yellow-500/10 border border-yellow-500/30 p-3 space-y-2">
                        <div class="flex items-center gap-1.5">
                            <KeyRoundIcon class="size-3.5 text-yellow-500 shrink-0" />
                            <p class="text-xs font-medium text-yellow-600 dark:text-yellow-400">
                                Copy your secret now — it won't be shown again
                            </p>
                        </div>
                        <div class="flex items-center gap-2">
                            <code class="flex-1 text-xs font-mono break-all bg-background px-2 py-1.5 rounded border">
                                {plainSecret}
                            </code>
                            <Button variant="outline" size="icon" onclick={copySecret} title="Copy secret">
                                {#if copiedSecret}
                                    <CheckIcon class="size-4 text-green-500" />
                                {:else}
                                    <ClipboardIcon class="size-4" />
                                {/if}
                            </Button>
                        </div>
                    </div>
                {/if}

                <!-- Step-by-step guide -->
                <div class="space-y-2">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Setup steps for {providerLabel}
                    </p>
                    <ol class="space-y-1.5">
                        {#each guideSteps as s, i (i)}
                            <li
                                    class="flex gap-2.5 items-start p-2.5 rounded-lg border cursor-pointer transition-colors
                                       {guideStep === i
                                           ? 'bg-primary/5 border-primary/30'
                                           : 'bg-card hover:bg-muted/40'}"
                                    onclick={() => (guideStep = i)}
                                    role="button"
                                    tabindex="0"
                                    onkeydown={(e) => e.key === 'Enter' && (guideStep = i)}
                            >
                                <span class="flex items-center justify-center size-5 rounded-full text-xs font-semibold shrink-0 mt-0.5
                                    {guideStep > i
                                        ? 'bg-green-500 text-white'
                                        : guideStep === i
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted text-muted-foreground'}">
                                    {#if guideStep > i}
                                        <CheckIcon class="size-3" />
                                    {:else}
                                        {i + 1}
                                    {/if}
                                </span>
                                <span class="text-xs leading-relaxed
                                    {guideStep === i ? 'text-foreground font-medium' : 'text-muted-foreground'}">
                                    {s}
                                </span>
                            </li>
                        {/each}
                    </ol>

                    <div class="flex items-center justify-between pt-1">
                        <Button
                                variant="ghost"
                                size="sm"
                                disabled={guideStep === 0}
                                onclick={() => (guideStep = Math.max(0, guideStep - 1))}
                        >
                            <ArrowLeftIcon class="size-3.5 mr-1" /> Previous
                        </Button>
                        {#if guideStep < guideSteps.length - 1}
                            <Button
                                    size="sm"
                                    onclick={() => (guideStep = Math.min(guideSteps.length - 1, guideStep + 1))}
                            >
                                Next <ArrowRightIcon class="size-3.5 ml-1" />
                            </Button>
                        {:else}
                            <Button size="sm" onclick={() => { open = false; reset(); }} class="gap-1.5">
                                <ShieldCheckIcon class="size-3.5" /> Done
                            </Button>
                        {/if}
                    </div>
                </div>

                <!-- Verify hint -->
                <div class="rounded-lg border bg-muted/30 p-3 flex gap-2.5">
                    <ShieldCheckIcon class="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <p class="text-xs text-muted-foreground leading-relaxed">
                        After saving in {providerLabel}, a ping will be sent to your webhook URL.
                        Check <span class="font-medium text-foreground">Delivery history</span> on the webhook row —
                        a <Badge variant="outline" class="text-xs py-0 px-1">pong</Badge> confirms it's working.
                    </p>
                </div>
            </div>

            <Dialog.Footer class="mt-4">
                <Button variant="outline" onclick={() => { open = false; reset(); }}>Close</Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>