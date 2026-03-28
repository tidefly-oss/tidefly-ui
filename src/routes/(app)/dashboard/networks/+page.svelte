<script lang="ts">
  import NetworksList from "$lib/components/networks/NetworksList.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-lg font-semibold">Networks</h1>
    <p class="text-sm text-muted-foreground">{data.networks.length} total</p>
  </div>
  <NetworksList initialData={data.networks} />
</div>
