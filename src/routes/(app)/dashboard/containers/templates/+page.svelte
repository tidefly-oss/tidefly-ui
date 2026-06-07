<script lang="ts">
import { goto } from "$app/navigation";
import TemplateDeployWizard from "$lib/components/containers/TemplateDeployWizard.svelte";
import type { PageData } from "./$types";

const { data }: { data: PageData } = $props();
</script>

<TemplateDeployWizard summaries={data.summaries} />
