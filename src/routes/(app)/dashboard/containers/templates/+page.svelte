<script lang="ts">
import { goto } from "$app/navigation";
import TemplateDeployWizard from "$lib/components/containers/templates/TemplateDeployWizard.svelte";
import type { PageData } from "./$types";

let { data }: { data: PageData } = $props();
</script>

<TemplateDeployWizard summaries={data.summaries} />
