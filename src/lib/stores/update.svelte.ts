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

	async function triggerUpdate() {
		if (updating) return;
		updating = true;
		updateError = null;
		updateDone = false;
		progressMessages = [];
		try {
			const { systemApi } = await import("$lib/api/v1/system");
			await systemApi.triggerUpdate();
		} catch (e) {
			updating = false;
			updateError = e instanceof Error ? e.message : "update failed";
		}
	}

	function setVersionInfo(v: VersionInfo) {
		info = v;
	}

	function onUpdateProgress(step: string, message: string) {
		progressMessages = [...progressMessages, { step, message, ts: Date.now() }].slice(-20);
	}

	function onUpdateDone() {
		updating = false;
		updateError = null;
		updateDone = true;
	}

	function onUpdateFailed(error: string) {
		updating = false;
		updateError = error;
		updateDone = false;
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
