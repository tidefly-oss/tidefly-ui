import { type AppLog, type AuditLog } from '$lib/api/v1/types';
import {logsApi} from "$lib/api/v1/logs";

// ── App Logs Store ────────────────────────────────────────────────────────────

function createAppLogsStore() {
	let logs = $state<AppLog[]>([]);
	let total = $state(0);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let offset = $state(0);
	const limit = 100;

	// SSE
	let eventSource = $state<EventSource | null>(null);
	let streaming = $state(false);

	async function load(params: { level?: string; component?: string; reset?: boolean } = {}) {
		if (params.reset) {
			offset = 0;
			logs = [];
		}
		loading = true;
		error = null;
		try {
			const res = await logsApi.listApp({ limit, offset, ...params });
			if (params.reset || offset === 0) {
				logs = res.logs;
			} else {
				logs = [...logs, ...res.logs];
			}
			total = res.total;
			offset = logs.length;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load logs';
		} finally {
			loading = false;
		}
	}

	// Löscht Alerts nur lokal aus dem Store (kein API-Call)
	function clearAlerts() {
		logs = logs.filter((l) => !['WARN', 'ERROR', 'FATAL'].includes(l.level as string));
		total = logs.length;
	}

	function startStream(params: { level?: string; component?: string } = {}) {
		stopStream();
		const q = new URLSearchParams();
		if (params.level) q.set('level', params.level);
		if (params.component) q.set('component', params.component);

		const queryString = q.size ? '?' + q.toString() : '';
		const url = `/api/v1/logs/app/stream${queryString}`;
		eventSource = new EventSource(url);
		streaming = true;

		eventSource.addEventListener('log', (e) => {
			try {
				const entry: AppLog = JSON.parse(e.data);
				// Neueste oben
				logs = [entry, ...logs];
				total += 1;
				// Max 500 im Speicher halten
				if (logs.length > 500) {
					logs = logs.slice(0, 500);
				}
			} catch {}
		});

		eventSource.onerror = () => {
			streaming = false;
		};
	}

	function stopStream() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
		streaming = false;
	}

	return {
		get logs() { return logs; },
		get total() { return total; },
		get loading() { return loading; },
		get error() { return error; },
		get streaming() { return streaming; },
		get hasMore() { return logs.length < total; },
		load,
		loadMore: (params?: { level?: string; component?: string }) => load(params),
		clearAlerts,
		startStream,
		stopStream,
	};
}

// ── Audit Logs Store ──────────────────────────────────────────────────────────

function createAuditLogsStore() {
	let logs = $state<AuditLog[]>([]);
	let total = $state(0);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let offset = $state(0);
	const limit = 100;

	async function load(params: { user_id?: string; action?: string; success?: boolean; reset?: boolean } = {}) {
		if (params.reset) {
			offset = 0;
			logs = [];
		}
		loading = true;
		error = null;
		try {
			const res = await logsApi.listAudit({ limit, offset, ...params });
			if (params.reset || offset === 0) {
				logs = res.logs;
			} else {
				logs = [...logs, ...res.logs];
			}
			total = res.total;
			offset = logs.length;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load audit logs';
		} finally {
			loading = false;
		}
	}

	return {
		get logs() { return logs; },
		get total() { return total; },
		get loading() { return loading; },
		get error() { return error; },
		get hasMore() { return logs.length < total; },
		load,
		loadMore: (params?: { user_id?: string; action?: string; success?: boolean }) => load(params),
	};
}

export const appLogsStore = createAppLogsStore();
export const auditLogsStore = createAuditLogsStore();