import { systemApi } from "$lib/api/v1/system";
import type { SystemInfo } from "$lib/api/v1/types";

function formatUptime(seconds: number): string {
	if (!seconds) return "—";
	const d = Math.floor(seconds / 86400);
	const h = Math.floor((seconds % 86400) / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (d > 0) return `${d}d ${h}h`;
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

function createSystemInfoStore() {
	let info = $state<SystemInfo | null>(null);
	let interval: ReturnType<typeof setInterval> | null = null;

	async function load() {
		try {
			info = await systemApi.info();
		} catch {}
	}

	function startPolling(ms = 60_000) {
		stopPolling();
		interval = setInterval(load, ms);
	}

	function stopPolling() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	return {
		get info() {
			return info;
		},
		get uptime() {
			return info ? formatUptime(info.uptime_seconds) : "—";
		},
		get version() {
			return info?.tidefly_version ?? "dev";
		},
		load,
		startPolling,
		stopPolling,
	};
}

export const systemInfoStore = createSystemInfoStore();
