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

export interface UpdateProgress {
	step: string;
	message: string;
	ts: number;
}

function createUpdateStore() {
	let info = $state<VersionInfo | null>(null);
	let loadingNotes = $state(false);
	let updating = $state(false);
	let updateError = $state<string | null>(null);
	let updateDone = $state(false);
	let progressMessages = $state<UpdateProgress[]>([]);

	// Guards the self-update health-poll so it only ever runs once per update.
	let healthPollActive = false;

	async function triggerUpdate() {
		if (updating) return;
		updating = true;
		updateError = null;
		updateDone = false;
		progressMessages = [];
		healthPollActive = false;
		try {
			const { systemApi } = await import("$lib/api/v1/system");
			await systemApi.triggerUpdate();
		} catch (e) {
			// A dropped/aborted request during the self-update is EXPECTED — the
			// plane restarts and kills the in-flight connection. Treat it as the
			// switch-over signal and fall back to health polling, not an error.
			if (updating) {
				startSelfUpdateHealthPoll();
				return;
			}
			updating = false;
			updateError = e instanceof Error ? e.message : "update failed";
		}
	}

	// When the plane replaces its own container, the WebSocket carrying
	// deploy.done dies before the event arrives — so onUpdateDone() may never
	// fire. Instead we poll /health until the new backend answers, then mark
	// the update complete ourselves. This is the reliable completion signal.
	function startSelfUpdateHealthPoll() {
		if (healthPollActive) return;
		healthPollActive = true;

		const startedAt = Date.now();
		const timeoutMs = 90_000; // give the new container time to boot + migrate
		const intervalMs = 2_000;

		const tick = async () => {
			if (!updating) {
				healthPollActive = false;
				return; // done/failed via another path
			}
			if (Date.now() - startedAt > timeoutMs) {
				healthPollActive = false;
				onUpdateFailed("update timed out — the new version did not come back online");
				return;
			}
			try {
				const res = await fetch("/health", { cache: "no-store" });
				if (res.ok) {
					healthPollActive = false;
					onUpdateDone();
					// reload so the freshly updated UI + assets are loaded
					setTimeout(() => window.location.reload(), 1500);
					return;
				}
			} catch {
				// backend still down / mid-switch — keep polling
			}
			setTimeout(tick, intervalMs);
		};

		// small initial delay: the old container is still up the instant the
		// request drops; wait before probing so we don't get a false "ok".
		setTimeout(tick, intervalMs);
	}

	function setVersionInfo(v: VersionInfo) {
		info = v;
	}

	function onUpdateProgress(step: string, message: string) {
		progressMessages = [...progressMessages, { step, message, ts: Date.now() }].slice(-20);
		// Once the plane starts swapping itself, the WS is about to drop. Arm the
		// health poll now so completion is caught even if deploy.done never lands.
		if (updating && step === "restarting") {
			startSelfUpdateHealthPoll();
		}
	}

	function onUpdateDone() {
		updating = false;
		updateError = null;
		updateDone = true;
		healthPollActive = false;
	}

	function onUpdateFailed(error: string) {
		updating = false;
		updateError = error;
		updateDone = false;
		healthPollActive = false;
	}

	return {
		get info() {
			return info;
		},
		get hasUpdate() {
			return info?.any_update_available ?? false;
		},
		get loadingNotes() {
			return loadingNotes;
		},
		get updating() {
			return updating;
		},
		get updateError() {
			return updateError;
		},
		get updateDone() {
			return updateDone;
		},
		get progressMessages() {
			return progressMessages;
		},
		get components() {
			return info?.components ?? [];
		},
		get releaseNotes() {
			return info?.components.find((c) => c.update_available)?.changelog ?? null;
		},
		setVersionInfo,
		triggerUpdate,
		onUpdateProgress,
		onUpdateDone,
		onUpdateFailed,
	};
}

export const updateStore = createUpdateStore();