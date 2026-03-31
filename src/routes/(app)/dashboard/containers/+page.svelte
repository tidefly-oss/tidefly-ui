<script lang="ts">
import { DatabaseIcon, FileCodeIcon } from "@lucide/svelte";
import { goto } from "$app/navigation";
import ContainersList from "$lib/components/containers/ContainersList.svelte";
import { Button } from "$lib/components/ui/button/index.js";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between gap-4 flex-wrap">
    <h1 class="text-lg font-semibold">Containers</h1>
    <div class="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onclick={() => goto("/dashboard/services/templates")}
      >
        <DatabaseIcon class="size-3.5 mr-1.5" /> From Template
      </Button>
      <Button size="sm" onclick={() => goto("/dashboard/containers/deploy")}>
        <FileCodeIcon class="size-3.5 mr-1.5" /> Custom Deploy
      </Button>
    </div>
  </div>

  <ContainersList initialData={data.containers} />
</div>
