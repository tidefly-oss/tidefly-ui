import { systemApi } from "$lib/api";
import type { HealthResponse, OverviewResponse, SystemInfo } from "$lib/api/v1/types";

function createSystemStore() {
	let health = $state<HealthResponse | null>(null);
	let info = $state<SystemInfo | null>(null);
	let overview = $state<OverviewResponse | null>(null);
	let loading = $state(false);
	let overviewLoaded = false;
	let infoLoaded = false;

	async function loadOverview(force = false) {
		if (overviewLoaded && !force) return;
		loading = true;
		try {
			overview = await systemApi.overview();
			overviewLoaded = true;
		} finally {
			loading = false;
		}
	}

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

	async function loadAll(force = false) {
		await Promise.all([loadOverview(force), loadInfo(force)]);
	}

	return {
		get health() {
			return health;
		},
		get info() {
			return info;
		},
		get overview() {
			return overview;
		},
		get loading() {
			return loading;
		},
		loadOverview,
		loadInfo,
		loadAll,
	};
}

export const systemStore = createSystemStore();
