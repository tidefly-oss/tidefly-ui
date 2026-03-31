import { tokenStore } from "$lib/api/client";

export interface CaddyLogEntry {
	ts: string;
	level: string;
	logger: string;
	msg?: string;
	method?: string;
	uri?: string;
	proto?: string;
	host?: string;
	remote_addr?: string;
	user_agent?: string;
	status?: number;
	size?: number;
	duration?: number;
	error?: string;
}
function caddyLogsUrl(tail = 100): string {
	const token = tokenStore.get();
	const base = `/api/v1/system/caddy-logs?tail=${tail}`;
	return token ? `${base}&token=${encodeURIComponent(token)}` : base;
}

function createCaddyLogsStore() {
	let entries = $state<CaddyLogEntry[]>([]);
	let connected = $state(false);
	let error = $state<string | null>(null);
	let es: EventSource | null = null;
	const MAX = 500;

	function connect(tail = 100) {
		disconnect();
		error = null;

		es = new EventSource(caddyLogsUrl(tail));

		es.onopen = () => {
			connected = true;
			error = null;
		};

		es.onmessage = (e) => {
			try {
				const entry: CaddyLogEntry = JSON.parse(e.data);
				entries = [entry, ...entries].slice(0, MAX);
			} catch {}
		};

		es.addEventListener("ping", () => {
			// keepalive — no-op
		});

		es.addEventListener("error", (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data);
				error = data.error ?? "Unknown error";
			} catch {}
		});

		es.onerror = () => {
			connected = false;
			// EventSource auto-reconnects — don't close
		};
	}

	function disconnect() {
		es?.close();
		es = null;
		connected = false;
	}

	function clear() {
		entries = [];
	}

	return {
		get entries() {
			return entries;
		},
		get connected() {
			return connected;
		},
		get error() {
			return error;
		},
		connect,
		disconnect,
		clear,
	};
}

export const caddyLogsStore = createCaddyLogsStore();
