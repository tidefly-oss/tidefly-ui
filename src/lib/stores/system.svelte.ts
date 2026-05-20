import { systemApi } from "$lib/api";
import type { HealthResponse, SystemInfo } from "$lib/api/v1/types";
import { type SystemMetricsPayload, wsStore } from "$lib/stores/ws.svelte";

interface LiveMetrics {
	cpu_percent: number;
	mem_percent: number;
	disk_used: number;
	disk_total: number;
}
function createSystemStore() {
	let health = $state<HealthResponse | null>(null);
	let info = $state<SystemInfo | null>(null);
	let metrics = $state<LiveMetrics | null>(null);
	let loading = $state(false);
	let infoLoaded = false;
	let unsub: (() => void) | null = null;

	async function loadInfo(force = false) {
		if (infoLoaded && !force) return;
		loading = true;
		try {
			[health, info] = await Promise.all([systemApi.health(), systemApi.info()]);
			infoLoaded = true;
		} finally {
			loading = false;
		}
	}

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
		get health() {
			return health;
		},
		get info() {
			return info;
		},
		get metrics() {
			return metrics;
		},
		get loading() {
			return loading;
		},
		loadInfo,
		connectWS,
		disconnectWS,
	};
}

export const systemStore = createSystemStore();
