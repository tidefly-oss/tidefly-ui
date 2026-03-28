<script lang="ts">
  import { goto } from "$app/navigation";
  import DeployServicesList from "$lib/components/services/DeployServicesList.svelte";
  import { Button } from "$lib/components/ui/button/index.js";
  import { PlusIcon } from "@lucide/svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-lg font-semibold">Services</h1>
      <p class="text-sm text-muted-foreground">
        {data.services.length} deployed
      </p>
    </div>
    <Button size="sm" onclick={() => goto("/dashboard/services/templates")}>
      <PlusIcon class="size-3.5 mr-1.5" /> Deploy Service
    </Button>
  </div>
  <DeployServicesList initialData={data.services} />
</div>
