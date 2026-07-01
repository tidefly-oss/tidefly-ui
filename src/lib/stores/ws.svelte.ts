import ReconnectingWebSocket from "reconnecting-websocket";
import { tokenStore } from "$lib/api/client";
import { containersApi } from "$lib/api/v1/containers/index.js";
import type { Container } from "$lib/api/v1/types";
import { updateStore } from "./update.svelte";

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
	container_count: number;  // ← neu
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

type Listener<T = unknown> = (payload: T) => void;

function createWSStore() {
	let connected = $state(false);
	let ws: ReconnectingWebSocket | null = null;
	let onDeployDone: (() => void) | null = null;
	const listeners = new Map<WSEventType, Set<Listener>>();

	let containerPatches = $state<Record<string, string>>({});
	let deletedContainerIds = $state<Set<string>>(new Set());
	let liveContainers = $state<Container[] | null>(null);

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
	function patchContainer(id: string, status: string) {
		containerPatches = { ...containerPatches, [id]: status };
	}

	function markDeleted(id: string) {
		deletedContainerIds = new Set([...deletedContainerIds, id]);
	}

	function setDeployDoneCallback(cb: (() => void) | null) {
		onDeployDone = cb;
	}

	function registerEventHandlers() {
		on<ContainerUpdatedPayload>("container.updated", (p) => {
			patchContainer(p.id, p.status);
		});

		on<ContainerDeletedPayload>("container.deleted", (p) => {
			markDeleted(p.id);
		});

		on<DeployProgressPayload>("deploy.progress", (p) => {
			if (p.deploy_id === "system-update") {
				updateStore.onUpdateProgress(p.step, p.message);
			}
		});

		on<DeployDonePayload>("deploy.done", (p) => {
			if (p.deploy_id !== "system-update") {
				containersApi.list(true).then((list) => {
					liveContainers = list;
					onDeployDone?.();
				});
			}
		});

		on<DeployFailedPayload>("deploy.failed", (p) => {
			if (p.deploy_id === "system-update") updateStore.onUpdateFailed(p.error);
		});
	}

	function connect(topics: string[] = ["*"]) {
		if (ws) return;

		const token = tokenStore.get();
		if (!token) {
			setTimeout(() => connect(topics), 1000);
			return;
		}

		registerEventHandlers();

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
		containerPatches = {};
		deletedContainerIds = new Set();
		liveContainers = null;
	}

	function ping() {
		ws?.send(JSON.stringify({ type: "ping" }));
	}

	return {
		get connected() {
			return connected;
		},
		get containerPatches() {
			return containerPatches;
		},
		get deletedContainerIds() {
			return deletedContainerIds;
		},
		get liveContainers() {
			return liveContainers;
		},
		setDeployDoneCallback,
		patchContainer,
		markDeleted,
		connect,
		disconnect,
		ping,
		on,
	};
}

export const wsStore = createWSStore();
