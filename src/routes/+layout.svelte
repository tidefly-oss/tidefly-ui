<script lang="ts">
import { QueryClient, QueryClientProvider } from "@tanstack/svelte-query";
import type { Snippet } from "svelte";
import { onMount } from "svelte";
import { Toaster } from "svelte-sonner";
import { theme } from "$lib/stores/theme.svelte";
import "./layout.css";

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
		},
	},
});

let { children }: { children: Snippet } = $props();

onMount(() => {
	theme.init();
});
</script>

<QueryClientProvider client={queryClient}>
  <Toaster richColors theme="system" position="top-right" />
  {@render children()}
</QueryClientProvider>