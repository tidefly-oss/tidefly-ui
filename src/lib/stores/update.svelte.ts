const GITHUB_API = "https://api.github.com/repos/tidefly-oss/tidefly-plane/releases/latest";
const POLL_INTERVAL = 30 * 60 * 1000; // 30min

interface UpdateInfo {
	current: string;
	latest: string;
	has_update: boolean;
	release_url: string;
	release_name: string;
}

function semverGt(a: string, b: string): boolean {
	const parse = (s: string) => s.replace(/^v/, "").split(/[-.]/).slice(0, 3).map(Number);
	const [aMaj, aMin, aPatch] = parse(a);
	const [bMaj, bMin, bPatch] = parse(b);
	if (aMaj !== bMaj) return aMaj > bMaj;
	if (aMin !== bMin) return aMin > bMin;
	return aPatch > bPatch;
}

function createUpdateStore() {
	let update = $state<UpdateInfo | null>(null);
	let loading = $state(false);
	let releaseNotes = $state<string | null>(null);
	let loadingNotes = $state(false);
	let interval: ReturnType<typeof setInterval> | null = null;

	async function check(currentVersion: string) {
		if (!currentVersion || currentVersion === "dev") return;
		loading = true;
		try {
			const res = await fetch(GITHUB_API, {
				headers: { Accept: "application/vnd.github+json" },
			});
			if (!res.ok) return;
			const data = await res.json();
			const latest = (data.tag_name as string) ?? "";
			update = {
				current: currentVersion,
				latest,
				has_update: semverGt(latest, currentVersion),
				release_url:
					data.html_url ?? `https://github.com/tidefly-oss/tidefly-plane/releases/latest`,
				release_name: data.name ?? latest,
			};
			// Cache notes from initial fetch
			if (releaseNotes === null && data.body) {
				releaseNotes = data.body;
			}
		} catch {
			// silently ignore
		} finally {
			loading = false;
		}
	}

	async function fetchNotes() {
		if (releaseNotes !== null || !update) return;
		loadingNotes = true;
		try {
			const res = await fetch(GITHUB_API, {
				headers: { Accept: "application/vnd.github+json" },
			});
			if (!res.ok) return;
			const data = await res.json();
			releaseNotes = data.body ?? "";
		} catch {
			releaseNotes = "";
		} finally {
			loadingNotes = false;
		}
	}

	function startPolling(currentVersion: string) {
		check(currentVersion);
		stopPolling();
		interval = setInterval(() => check(currentVersion), POLL_INTERVAL);
	}

	function stopPolling() {
		if (interval) {
			clearInterval(interval);
			interval = null;
		}
	}

	return {
		get update() {
			return update;
		},
		get hasUpdate() {
			return update?.has_update ?? false;
		},
		get loading() {
			return loading;
		},
		get releaseNotes() {
			return releaseNotes;
		},
		get loadingNotes() {
			return loadingNotes;
		},
		check,
		fetchNotes,
		startPolling,
		stopPolling,
	};
}

export const updateStore = createUpdateStore();
