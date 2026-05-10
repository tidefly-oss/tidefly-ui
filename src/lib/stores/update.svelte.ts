const POLL_INTERVAL = 30 * 60 * 1000; // 30min

export interface ComponentVersion {
	name: string;
	current: string;
	latest: string;
	update_available: boolean;
	changelog: string;
	release_url: string;
	prerelease: boolean;
}

export interface VersionInfo {
	components: ComponentVersion[];
	any_update_available: boolean;
}

function createUpdateStore() {
	let info = $state<VersionInfo | null>(null);
	let loading = $state(false);
	let loadingNotes = $state(false);
	let updating = $state(false);
	let interval: ReturnType<typeof setInterval> | null = null;

	async function check() {
		loading = true;
		try {
			const { systemApi } = await import("$lib/api/v1/system");
			info = await systemApi.version();
		} catch {
			// silently ignore
		} finally {
			loading = false;
		}
	}

	async function fetchNotes() {
		if (info?.components.some((c) => c.changelog)) return;
		loadingNotes = true;
		await check();
		loadingNotes = false;
	}

	async function triggerUpdate() {
		if (updating) return;
		updating = true;
		try {
			const { systemApi } = await import("$lib/api/v1/system");
			await systemApi.triggerUpdate();
		} finally {
			updating = false;
		}
	}

	function startPolling(currentVersion: string) {
		if (!currentVersion || currentVersion === "dev") return;
		void check();
		stopPolling();
		interval = setInterval(() => check(), POLL_INTERVAL);
	}

	function stopPolling() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	// Plane component for backward compat (sidebar version display)
	const planeComponent = $derived(info?.components.find((c) => c.name === "plane") ?? null);

	return {
		get info() {
			return info;
		},
		get hasUpdate() {
			return info?.any_update_available ?? false;
		},
		get loading() {
			return loading;
		},
		get loadingNotes() {
			return loadingNotes;
		},
		get updating() {
			return updating;
		},
		get components() {
			return info?.components ?? [];
		},
		get planeVersion() {
			return planeComponent?.current ?? null;
		},
		// changelog from first component that has an update
		get releaseNotes() {
			return info?.components.find((c) => c.update_available)?.changelog ?? null;
		},
		check,
		fetchNotes,
		triggerUpdate,
		startPolling,
		stopPolling,
	};
}

export const updateStore = createUpdateStore();
