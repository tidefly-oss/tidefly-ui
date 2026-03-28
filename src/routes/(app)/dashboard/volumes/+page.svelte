<script lang="ts">
  import VolumesList from "$lib/components/volumes/VolumesList.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-lg font-semibold">Volumes</h1>
  </div>
  <VolumesList initialData={data.volumes} />
</div>
