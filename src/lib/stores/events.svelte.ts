import { tokenStore } from "$lib/api/client";
import type { ContainerStatus } from "$lib/api/v1/types";
import { getQueryClient } from "$lib/query";

type ContainerEventType =
	| "start"
	| "stop"
	| "die"
	| "kill"
	| "restart"
	| "pause"
	| "unpause"
	| "destroy"
	| "create"
	| "oom";

interface ContainerEvent {
	type: ContainerEventType;
	container_id: string;
	name: string;
	image: string;
	status: ContainerStatus;
	time: string;
}

class DockerEventsStore {
	private source: EventSource | null = null;
	private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

	connect() {
		if (this.source) return;
		this._connect();
	}

	private _connect() {
		const token = tokenStore.get();
		if (!token) {
			// Retry when token is available
			this.reconnectTimer = setTimeout(() => this._connect(), 1000);
			return;
		}

		const url = `/api/v1/events/stream?token=${encodeURIComponent(token)}`;
		const source = new EventSource(url, { withCredentials: true });

		source.addEventListener("container", (e: MessageEvent) => {
			try {
				const evt: ContainerEvent = JSON.parse(e.data);
				this._handleEvent(evt);
			} catch {}
		});

		source.addEventListener("error", () => {
			source.close();
			this.source = null;
			this.reconnectTimer = setTimeout(() => this._connect(), 3000);
		});

		this.source = source;
	}

	disconnect() {
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		this.source?.close();
		this.source = null;
	}

	private _handleEvent(evt: ContainerEvent) {
		const qc = getQueryClient();

		const statusMap: Partial<Record<ContainerEventType, ContainerStatus>> = {
			start: "running",
			unpause: "running",
			restart: "running",
			stop: "exited",
			die: "exited",
			kill: "exited",
			oom: "exited",
			pause: "paused",
		};

		if (evt.type === "destroy" || evt.type === "create") {
			void qc.invalidateQueries({ queryKey: ["containers"] });
			return;
		}

		const newStatus = statusMap[evt.type];
		if (newStatus) {
			qc.setQueryData<{ id: string; status: ContainerStatus }[]>(
				["containers"],
				(old) =>
					old?.map((c) => (c.id === evt.container_id ? { ...c, status: newStatus } : c)) ?? []
			);
			qc.setQueryData<{ id: string; status: ContainerStatus }>(
				["container", evt.container_id],
				(old) => (old ? { ...old, status: newStatus } : old)
			);
		}
	}
}

export const dockerEventsStore = new DockerEventsStore();
