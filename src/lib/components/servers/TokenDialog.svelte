<script lang="ts">
    import { agentApi } from "$lib/api/v1/agent/index.js";
    import { Button } from "$lib/components/ui/button/index.js";
    import * as Alert from "$lib/components/ui/alert/index.js";
    import * as Dialog from "$lib/components/ui/dialog/index.js";
    import { createMutation } from "@tanstack/svelte-query";
    import {
        CheckIcon,
        ClipboardIcon,
        KeyIcon,
        Loader,
        TerminalIcon,
    } from "@lucide/svelte";

    interface Props {
        open: boolean;
        onTokenCreated: () => void;
    }

    let { open = $bindable(), onTokenCreated }: Props = $props();

    let tokenLabel = $state("");
    let createdToken = $state<string | null>(null);
    let createdExpiresAt = $state<string | null>(null);
    let tokenCopied = $state(false);
    let cmdCopied = $state(false);

    const createTokenMutation = createMutation(() => ({
        mutationFn: () => agentApi.createToken({ label: tokenLabel }),
        onSuccess: (data) => {
            createdToken = data.token;
            createdExpiresAt = data.expires_at;
            tokenLabel = "";
            onTokenCreated();
        },
    }));

    function copyToken() {
        if (!createdToken) return;
        navigator.clipboard.writeText(createdToken);
        tokenCopied = true;
        setTimeout(() => (tokenCopied = false), 2000);
    }

    function copyCmd() {
        navigator.clipboard.writeText(installCmd);
        cmdCopied = true;
        setTimeout(() => (cmdCopied = false), 2000);
    }

    function close() {
        open = false;
        // reset after close animation
        setTimeout(() => {
            createdToken = null;
            createdExpiresAt = null;
            tokenLabel = "";
            createTokenMutation.reset();
        }, 200);
    }

    const installCmd = $derived(
        createdToken
            ? `curl -fsSL https://raw.githubusercontent.com/tidefly-oss/tidefly-agent/main/scripts/install.sh | sudo PLANE_TOKEN=${createdToken} PLANE_ENDPOINT=YOUR_PLANE_HOST:7443 sh`
            : ""
    );

    function expiresIn(dateStr: string | null) {
        if (!dateStr) return "";
        const diff = new Date(dateStr).getTime() - Date.now();
        const hrs = Math.floor(diff / 3_600_000);
        if (hrs < 1) return "less than 1 hour";
        return `${hrs} hour${hrs > 1 ? "s" : ""}`;
    }
</script>

<Dialog.Root {open} onOpenChange={(v) => { if (!v) close(); }}>
    <Dialog.Content class="max-w-lg">
        <Dialog.Header>
            <Dialog.Title>Add Server</Dialog.Title>
            <Dialog.Description>
                Generate a one-time registration token and run the install script on your server.
            </Dialog.Description>
        </Dialog.Header>

        {#if !createdToken}
            <!-- Step 1: label + generate -->
            <div class="space-y-4 py-2">
                <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="token-label">
                        Label
                        <span class="text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                            id="token-label"
                            class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g. hetzner-fsn1-01"
                            bind:value={tokenLabel}
                            onkeydown={(e) => e.key === "Enter" && createTokenMutation.mutate()}
                    />
                </div>
            </div>

            <Dialog.Footer>
                <Button variant="outline" onclick={close}>Cancel</Button>
                <Button onclick={() => createTokenMutation.mutate()} disabled={createTokenMutation.isPending}>
                    {#if createTokenMutation.isPending}
                        <Loader class="size-4 mr-2 animate-spin" />
                    {:else}
                        <KeyIcon class="size-4 mr-2" />
                    {/if}
                    Generate Token
                </Button>
            </Dialog.Footer>

        {:else}
            <!-- Step 2: token + install command -->
            <div class="space-y-4 py-2">
                <Alert.Root class="border-green-500/30 bg-green-500/5">
                    <CheckIcon class="size-4 text-green-500" />
                    <Alert.Title class="text-green-500">Token Generated</Alert.Title>
                    <Alert.Description>
                        Valid for {expiresIn(createdExpiresAt)} · one-time use only.
                    </Alert.Description>
                </Alert.Root>

                <!-- Token -->
                <div class="space-y-1.5">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Registration Token
          </span>
                    <div class="flex items-center gap-2">
                        <code class="flex-1 text-xs bg-muted rounded-md px-3 py-2 font-mono break-all select-all">
                            {createdToken}
                        </code>
                        <Button variant="outline" size="icon" class="shrink-0" onclick={copyToken}>
                            {#if tokenCopied}
                                <CheckIcon class="size-4 text-green-500" />
                            {:else}
                                <ClipboardIcon class="size-4" />
                            {/if}
                        </Button>
                    </div>
                </div>

                <!-- Install command -->
                <div class="space-y-1.5">
          <span class="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TerminalIcon class="size-3.5" />
            Install Command
          </span>
                    <p class="text-xs text-muted-foreground">
                        Run on your server — replace <code class="bg-muted px-1 rounded">YOUR_PLANE_HOST</code> with your Plane's hostname or IP.
                    </p>
                    <div class="flex items-start gap-2">
                        <code class="flex-1 text-xs bg-muted rounded-md px-3 py-2.5 font-mono break-all leading-relaxed select-all">
                            {installCmd}
                        </code>
                        <Button variant="outline" size="icon" class="shrink-0" onclick={copyCmd}>
                            {#if cmdCopied}
                                <CheckIcon class="size-4 text-green-500" />
                            {:else}
                                <ClipboardIcon class="size-4" />
                            {/if}
                        </Button>
                    </div>
                </div>

                <p class="text-xs text-muted-foreground">
                    After successful registration the server will appear in the list automatically.
                </p>
            </div>

            <Dialog.Footer>
                <Button onclick={close}>Done</Button>
            </Dialog.Footer>
        {/if}
    </Dialog.Content>
</Dialog.Root>