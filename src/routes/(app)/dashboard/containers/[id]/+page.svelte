<script lang="ts">
import ContainerDetail from "$lib/components/containers/ContainerDetail.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<ContainerDetail initialData={data.container} />
