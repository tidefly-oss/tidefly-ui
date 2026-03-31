<script lang="ts">
import { FileCodeIcon, LayersIcon } from "@lucide/svelte";
import { page } from "$app/state";
import ContainerComposeTab from "$lib/components/containers/ContainerComposeTab.svelte";
import ContainerDockerfileTab from "$lib/components/containers/ContainerDockerfileTab.svelte";
import * as Tabs from "$lib/components/ui/tabs/index.js";

const gitUrl = $derived(page.url.searchParams.get("git_url") ?? "");
const gitBranch = $derived(page.url.searchParams.get("branch") ?? "");
const gitName = $derived(page.url.searchParams.get("name") ?? "");
</script>

<div class="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
  <div class="w-full max-w-2xl space-y-6">
    <div class="text-center">
      <h1 class="text-lg font-semibold">Custom Deploy</h1>
      <p class="text-muted-foreground text-sm mt-1">
        Deploy from a Dockerfile or docker-compose.yml
      </p>
    </div>

    <Tabs.Root value="dockerfile">
      <div class="flex justify-center">
        <Tabs.List class="w-fit bg-muted p-1 rounded-lg">
          <Tabs.Trigger
                  value="dockerfile"
                  class="flex items-center gap-2 px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! data-[state=active]:shadow-sm! data-[state=inactive]:text-muted-foreground"
          >
            <FileCodeIcon class="size-3.5" /> Dockerfile
          </Tabs.Trigger>
          <Tabs.Trigger
                  value="compose"
                  class="flex items-center gap-2 px-4 py-1.5 text-sm rounded-md data-[state=active]:bg-primary! data-[state=active]:text-primary-foreground! data-[state=active]:shadow-sm! data-[state=inactive]:text-muted-foreground"
          >
            <LayersIcon class="size-3.5" /> Compose
          </Tabs.Trigger>
        </Tabs.List>
      </div>

      <div class="mt-6">
        <Tabs.Content value="dockerfile">
          <ContainerDockerfileTab
                  initialName={gitName}
                  initialGitUrl={gitUrl}
                  initialBranch={gitBranch}
          />
        </Tabs.Content>
        <Tabs.Content value="compose">
          <ContainerComposeTab />
        </Tabs.Content>
      </div>
    </Tabs.Root>
  </div>
</div>