import { type SystemMetric } from '$lib/api/v1/types';
import {metricsApi} from "$lib/api/v1/metrics";

function createMetricsStore() {
	let metrics  = $state<SystemMetric[]>([]);
	let latest   = $state<SystemMetric | null>(null);
	let loading  = $state(false);
	let error    = $state<string | null>(null);
	let hours    = $state(24);
	let interval: ReturnType<typeof setInterval> | null = null;

	async function load(h = hours) {
		loading = true;
		error   = null;
		try {
			const res = await metricsApi.get(h);
			metrics = res.metrics ?? [];
			latest  = res.latest ?? null;
			hours   = h;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load metrics';
		} finally {
			loading = false;
		}
	}

	function startPolling(intervalMs = 60_000) {
		stopPolling();
		interval = setInterval(() => load(), intervalMs);
	}

	function stopPolling() {
		if (interval) { clearInterval(interval); interval = null; }
	}

	return {
		get metrics() { return metrics; },
		get latest()  { return latest; },
		get loading() { return loading; },
		get error()   { return error; },
		get hours()   { return hours; },
		load,
		startPolling,
		stopPolling,
	};
}

export const metricsStore = createMetricsStore();