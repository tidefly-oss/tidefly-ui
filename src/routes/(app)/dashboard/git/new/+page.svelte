<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { gitApi } from "$lib/api/v1/git";
  import { type GitProvider, providerMeta } from "$lib/api/v1/types/git.js";
  import { Badge } from "$lib/components/ui/badge/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import {
    CircleAlert,
    CircleCheckBig,
    ChevronRightIcon,
    ExternalLinkIcon,
    GitBranchIcon,
    KeyRoundIcon,
    LoaderCircleIcon,
    TagIcon,
  } from "@lucide/svelte";
  import { createMutation } from "@tanstack/svelte-query";
  import { SiBitbucket, SiGitea, SiGithub, SiGitlab } from "@icons-pack/svelte-simple-icons";

  let step = $state<1 | 2 | 3>(1);

  let selectedProvider = $state<GitProvider | null>(
          (page.url.searchParams.get("provider") as GitProvider) ?? null,
  );
  let name     = $state("");
  let token    = $state("");
  let baseURL  = $state("");
  let username = $state("");
  let error    = $state("");

  const createMut = createMutation(() => ({
    mutationFn: () => {
      if (!selectedProvider) throw new Error("No provider selected");
      return gitApi.create({
        name:     name.trim(),
        provider: selectedProvider,
        token:    token.trim(),
        base_url: baseURL.trim() || undefined,
        username: username.trim() || undefined,
      });
    },
    onSuccess: () => { step = 3; },
    onError: (err: Error) => { error = err.message ?? "Something went wrong"; },
  }));

  const meta = $derived(selectedProvider ? providerMeta[selectedProvider] : null);

  const tokenDocUrl: Record<GitProvider, string> = {
    github:    "https://github.com/settings/tokens/new?scopes=repo",
    gitlab:    "https://gitlab.com/-/profile/personal_access_tokens",
    gitea:     "",
    bitbucket: "https://bitbucket.org/account/settings/app-passwords/new",
  };

  const tokenHint: Record<GitProvider, string> = {
    github:    "Personal Access Token with repo scope",
    gitlab:    "Personal Access Token with read_repository scope",
    gitea:     "Access Token from your Gitea / Forgejo instance",
    bitbucket: "App Password — not your account password",
  };

  function canProceedStep2() {
    if (!name.trim() || !token.trim()) return false;
    if (meta?.requiresBaseUrl && !baseURL.trim()) return false;
    return !(meta?.requiresUsername && !username.trim());
  }

  function selectProvider(p: GitProvider) {
    selectedProvider = p;
    step = 2;
  }

  function providerIcon(provider: string) {
    const map: Record<string, any> = {
      github:    SiGithub,
      gitlab:    SiGitlab,
      gitea:     SiGitea,
      bitbucket: SiBitbucket,
    };
    return map[provider] ?? GitBranchIcon;
  }
</script>

<div class="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
  <div class="w-full max-w-lg space-y-6">
    <!-- Step indicator -->
    <div class="flex items-center gap-2">
      {#each [1, 2, 3] as s}
        <div class="flex items-center gap-2">
          <div class="size-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors
            {step === s ? 'bg-primary text-primary-foreground' :
             step > s  ? 'bg-green-500 text-white' :
                         'bg-muted text-muted-foreground'}">
            {#if step > s}
              <CircleCheckBig class="size-3.5" />
            {:else}
              {s}
            {/if}
          </div>
          <span class="text-xs {step === s ? 'text-foreground font-medium' : 'text-muted-foreground'}">
            {s === 1 ? "Provider" : s === 2 ? "Credentials" : "Done"}
          </span>
        </div>
        {#if s < 3}
          <ChevronRightIcon class="size-3.5 text-muted-foreground" />
        {/if}
      {/each}
    </div>

    <!-- Step 1: Choose provider -->
    {#if step === 1}
      <div class="space-y-3">
        <div>
          <h2 class="text-base font-semibold">Choose a provider</h2>
          <p class="text-sm text-muted-foreground mt-0.5">
            Select the Git provider you want to connect.
          </p>
        </div>
        <div class="grid gap-3">
          {#each (["github", "gitlab", "gitea", "bitbucket"] as const) as provider}
            {@const m = providerMeta[provider]}
            {@const Icon = providerIcon(provider)}
            <button
                    onclick={() => selectProvider(provider)}
                    class="bg-card border rounded-xl p-4 text-left hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center gap-4 group w-full"
            >
              <span class="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon class="size-5" style="color: {m.color}" />
              </span>
              <span class="flex-1 min-w-0">
                <span class="block text-sm font-medium">{m.label}</span>
                <span class="block text-xs text-muted-foreground mt-0.5">
                  {provider === "github"    ? "github.com — personal, organization & private repos"
                          : provider === "gitlab"  ? "gitlab.com or self-hosted GitLab instance"
                                  : provider === "gitea"   ? "Self-hosted Gitea or Forgejo instance"
                                          : "bitbucket.org — workspace repositories"}
                </span>
              </span>
              <ChevronRightIcon class="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
            </button>
          {/each}
        </div>
      </div>

      <!-- Step 2: Credentials -->
    {:else if step === 2 && selectedProvider && meta}
      {@const Icon = providerIcon(selectedProvider)}
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <div class="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
            <Icon class="size-5" style="color: {meta.color}" />
          </div>
          <div>
            <h2 class="text-base font-semibold">{meta.label}</h2>
            <p class="text-sm text-muted-foreground">Enter your credentials</p>
          </div>
        </div>

        <div class="bg-card border rounded-xl p-4 space-y-4">
          <!-- Name -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium flex items-center gap-1.5">
              <TagIcon class="size-3" /> Integration name
            </label>
            <input type="text" placeholder="e.g. My GitHub" bind:value={name}
                   class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>

          <!-- Base URL (Gitea required) -->
          {#if meta.requiresBaseUrl}
            <div class="space-y-1.5">
              <label class="text-xs font-medium flex items-center gap-1.5">
                Base URL <Badge variant="outline" class="text-[10px] py-0">required</Badge>
              </label>
              <input type="url" placeholder="https://git.example.com" bind:value={baseURL}
                     class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          {/if}

          <!-- Base URL (GitLab optional) -->
          {#if selectedProvider === "gitlab"}
            <div class="space-y-1.5">
              <label class="text-xs font-medium">
                Base URL <span class="text-muted-foreground">(leave empty for gitlab.com)</span>
              </label>
              <input type="url" placeholder="https://gitlab.example.com" bind:value={baseURL}
                     class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          {/if}

          <!-- Username (Bitbucket) -->
          {#if meta.requiresUsername}
            <div class="space-y-1.5">
              <label class="text-xs font-medium flex items-center gap-1.5">
                Bitbucket username <Badge variant="outline" class="text-[10px] py-0">required</Badge>
              </label>
              <input type="text" placeholder="myusername" bind:value={username}
                     class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          {/if}

          <!-- Token -->
          <div class="space-y-1.5">
            <label class="text-xs font-medium flex items-center gap-1.5">
              <KeyRoundIcon class="size-3" />
              {selectedProvider === "bitbucket" ? "App Password" : "Access Token"}
            </label>
            <input type="password"
                   placeholder={selectedProvider === "bitbucket" ? "App password" : "ghp_xxxxxxxxxxxx"}
                   bind:value={token}
                   class="w-full px-3 py-2 text-sm bg-muted/50 border rounded-lg focus:outline-none focus:ring-1 focus:ring-ring font-mono" />
            <p class="text-xs text-muted-foreground">{tokenHint[selectedProvider]}</p>
            {#if tokenDocUrl[selectedProvider]}
              <a href={tokenDocUrl[selectedProvider]} target="_blank" rel="noopener noreferrer"
                 class="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Create token <ExternalLinkIcon class="size-3" />
              </a>
            {:else if selectedProvider === "gitea"}
              <p class="text-xs text-muted-foreground">
                Go to your Gitea/Forgejo instance → <strong>Settings → Applications → Access Tokens</strong>
              </p>
            {/if}
          </div>

          <!-- Security note -->
          <div class="bg-muted/50 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <KeyRoundIcon class="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p class="text-xs text-muted-foreground">
              Your token is encrypted with AES-256-GCM before being stored. It is never returned via the API.
            </p>
          </div>
        </div>

        {#if error}
          <div class="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
            <CircleAlert class="size-4 shrink-0" />
            {error}
          </div>
        {/if}

        <Button class="w-full" disabled={!canProceedStep2() || createMut.isPending} onclick={() => createMut.mutate()}>
          {#if createMut.isPending}
            <LoaderCircleIcon class="size-4 mr-2 animate-spin" /> Saving...
          {:else}
            Save integration
          {/if}
        </Button>
      </div>

      <!-- Step 3: Done -->
    {:else if step === 3}
      <div class="bg-card border rounded-xl p-8 text-center space-y-4">
        <div class="size-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
          <CircleCheckBig class="size-6 text-green-500" />
        </div>
        <div>
          <h2 class="font-semibold">Integration connected</h2>
          <p class="text-sm text-muted-foreground mt-1">
            <strong>{name}</strong> is ready. You can now deploy directly from your repositories.
          </p>
        </div>
        <div class="flex gap-3 justify-center flex-wrap">
          <a href="/dashboard/git">
            <Button variant="outline" size="sm">View integrations</Button>
          </a>
          <a href="/dashboard/git/deploy">
            <Button size="sm">
              <GitBranchIcon class="size-3.5 mr-1.5" />
              Deploy from repo
            </Button>
          </a>
        </div>
      </div>
    {/if}

  </div>
</div>