<script lang="ts">
import ImageList from "$lib/components/images/ImageList.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<div class="space-y-4">
  <div>
    <h1 class="text-lg font-semibold">Images</h1>
    <p class="text-sm text-muted-foreground">{data.images.length} total</p>
  </div>
  <ImageList initialData={data.images} />
</div>
