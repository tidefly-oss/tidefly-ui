<script lang="ts">
import { LoaderCircle } from "@lucide/svelte";

interface Props {
	message?: string;
}

let { message = "Loading..." }: Props = $props();
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
    <div class="flex items-center justify-center size-16 rounded-2xl bg-muted">
        <LoaderCircle class="size-8 text-primary animate-spin" />
    </div>
    <div class="text-center">
        <p class="text-sm font-medium">{message}</p>
        <p class="text-xs text-muted-foreground mt-1">Connecting to Tidefly...</p>
    </div>
</div>