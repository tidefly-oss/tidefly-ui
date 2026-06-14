import ReconnectingWebSocket from "reconnecting-websocket";
import { tokenStore } from "$lib/api/client";
import { getQueryClient } from "$lib/query";
import { updateStore } from "./update.svelte";

// ── Event Types ───────────────────────────────────────────────────────────────

export type WSEventType =
	| "container.updated"
	| "container.deleted"
	| "image.deleted"
	| "network.deleted"
	| "volume.deleted"
	| "service.created"
	| "service.updated"
	| "service.deleted"
	| "deploy.progress"
	| "deploy.done"
	| "deploy.failed"
	| "worker.updated"
	| "git.integration.created"
	| "git.integration.deleted"
	| "notification.created"
	| "system.metrics"
	| "pong";

export interface WSEvent<T = unknown> {
	type: WSEventType;
	topic: string;
	payload: T;
}

export interface ContainerUpdatedPayload {
	id: string;
	name: string;
	status: string;
	state: string;
}

export interface ContainerDeletedPayload {
	id: string;
}

export interface DeployProgressPayload {
	deploy_id: string;
	step: string;
	message: string;
}

export interface DeployDonePayload {
	deploy_id: string;
	service_id: string;
}

export interface DeployFailedPayload {
	deploy_id: string;
	service_id: string;
	error: string;
}

export interface WorkerUpdatedPayload {
	id: string;
	name: string;
	status: string;
	cpu_percent: number;
	mem_percent: number;
}

export interface NotificationCreatedPayload {
	id: string;
	title: string;
	message: string;
	level: string;
}

export interface SystemMetricsPayload {
	cpu_percent: number;
	mem_percent: number;
	disk_used: number;
	disk_total: number;
}

// ── Listener registry ─────────────────────────────────────────────────────────

type Listener<T = unknown> = (payload: T) => void;

const SERVICE_RELEVANT_STATES = new Set([
	"running",
	"unhealthy",
	"restarting",
	"dead",
	"exited",
	"oomkilled",
	"created",
	"paused",
]);

// ── Store ─────────────────────────────────────────────────────────────────────

function createWSStore() {
	let connected = $state(false);
	let ws: ReconnectingWebSocket | null = null;
	const listeners = new Map<WSEventType, Set<Listener>>();

	function on<T>(type: WSEventType, fn: Listener<T>): () => void {
		if (!listeners.has(type)) listeners.set(type, new Set());
		listeners.get(type)?.add(fn as Listener);
		return () => listeners.get(type)?.delete(fn as Listener);
	}

	function emit(type: WSEventType, payload: unknown) {
		listeners.get(type)?.forEach((fn) => {
			fn(payload);
		});
	}

	function registerQueryInvalidations() {
		const qc = getQueryClient();

		on<ContainerUpdatedPayload>("container.updated", (p) => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
			void qc.invalidateQueries({ queryKey: ["containers"] });
			void qc.invalidateQueries({ queryKey: ["container", p.id] });
			if (SERVICE_RELEVANT_STATES.has(p.state)) {
				void qc.invalidateQueries({ queryKey: ["services"] });
			}
		});

		on<ContainerDeletedPayload>("container.deleted", (p) => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
			void qc.invalidateQueries({ queryKey: ["containers"] });
			qc.removeQueries({ queryKey: ["container", p.id] });
			void qc.invalidateQueries({ queryKey: ["services"] });
		});

		on<WorkerUpdatedPayload>("worker.updated", (p) => {
			void qc.invalidateQueries({ queryKey: ["workers"] });
			void qc.invalidateQueries({ queryKey: ["worker", p.id] });
		});

		on("image.deleted", () => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
			void qc.invalidateQueries({ queryKey: ["images"] });
		});
		on("network.deleted", () => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
			void qc.invalidateQueries({ queryKey: ["networks"] });
		});
		on("volume.deleted", () => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
			void qc.invalidateQueries({ queryKey: ["volumes"] });
		});

		on("git.integration.created", () => qc.invalidateQueries({ queryKey: ["git-integrations"] }));
		on("git.integration.deleted", () => qc.invalidateQueries({ queryKey: ["git-integrations"] }));

		on("service.created", () => qc.invalidateQueries({ queryKey: ["services"] }));
		on("service.updated", () => qc.invalidateQueries({ queryKey: ["services"] }));
		on("service.deleted", () => qc.invalidateQueries({ queryKey: ["services"] }));

		on<DeployProgressPayload>("deploy.progress", (p) => {
			if (p.deploy_id === "system-update") {
				updateStore.onUpdateProgress(p.step, p.message);
			}
		});

		on<DeployDonePayload>("deploy.done", (p) => {
			void qc.invalidateQueries({ queryKey: ["dashboard", "overview"] });
			void qc.invalidateQueries({ queryKey: ["services"] });
			void qc.invalidateQueries({ queryKey: ["containers"] });
			if (p.deploy_id === "system-update") {
				updateStore.onUpdateDone();
			}
		});

		on<DeployFailedPayload>("deploy.failed", (p) => {
			void qc.invalidateQueries({ queryKey: ["services"] });
			if (p.deploy_id === "system-update") {
				updateStore.onUpdateFailed(p.error);
			}
		});
	}

	function connect(topics: string[] = ["*"]) {
		if (ws) return;

		const token = tokenStore.get();
		if (!token) {
			setTimeout(() => connect(topics), 1000);
			return;
		}

		registerQueryInvalidations();

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const url = `${protocol}//${window.location.host}/api/v1/ws?token=${encodeURIComponent(token)}`;

		ws = new ReconnectingWebSocket(url, [], {
			maxRetries: Infinity,
			reconnectionDelayGrowFactor: 1.3,
			minReconnectionDelay: 1000,
			maxReconnectionDelay: 30000,
		});

		ws.addEventListener("open", () => {
			connected = true;
			ws?.send(JSON.stringify({ type: "subscribe", topics }));
		});

		ws.addEventListener("close", () => {
			connected = false;
		});

		ws.addEventListener("message", (e: MessageEvent) => {
			try {
				const event: WSEvent = JSON.parse(e.data);
				emit(event.type, event.payload);
			} catch {}
		});
	}

	function disconnect() {
		ws?.close();
		ws = null;
		connected = false;
		listeners.clear();
	}

	function ping() {
		ws?.send(JSON.stringify({ type: "ping" }));
	}

	return {
		get connected() {
			return connected;
		},
		connect,
		disconnect,
		ping,
		on,
	};
}

export const wsStore = createWSStore();