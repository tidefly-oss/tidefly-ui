import { type SystemMetricsPayload, wsStore } from "$lib/stores/ws.svelte";

interface LiveMetrics {
	cpu_percent: number;
	mem_percent: number;
	disk_used: number;
	disk_total: number;
}

function createSystemStore() {
	let metrics = $state<LiveMetrics | null>(null);
	let unsub: (() => void) | null = null;

	function connectWS() {
		if (unsub) return;
		unsub = wsStore.on<SystemMetricsPayload>("system.metrics", (payload) => {
			metrics = {
				cpu_percent: payload.cpu_percent,
				mem_percent: payload.mem_percent,
				disk_used: payload.disk_used,
				disk_total: payload.disk_total,
			};
		});
	}

	function disconnectWS() {
		unsub?.();
		unsub = null;
	}

	return {
		get metrics() { return metrics; },
		connectWS,
		disconnectWS,
	};
}

export const systemStore = createSystemStore();