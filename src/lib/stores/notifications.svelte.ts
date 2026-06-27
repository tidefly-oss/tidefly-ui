import { notificationsApi } from "$lib/api/v1/notifications/index.js";
import type { Notification } from "$lib/api/v1/types";
import { type NotificationCreatedPayload, wsStore } from "$lib/stores/ws.svelte";

class NotificationsStore {
	items = $state<Notification[]>([]);
	error = $state<string | null>(null);

	get unread(): Notification[] {
		return this.items.filter((n) => !n.acknowledged_at);
	}

	get unreadCount(): number {
		return this.unread.length;
	}

	private unsub: (() => void) | null = null;

	seed(notifications: Notification[]) {
		this.items = notifications;
	}

	connectWS() {
		if (this.unsub) return;
		this.unsub = wsStore.on<NotificationCreatedPayload>("notification.created", (payload) => {
			const incoming = {
				id: payload.id,
				container_name: payload.title,
				message: payload.message,
				severity: payload.level as Notification["severity"],
				acknowledged_at: null,
				occurrence_count: 1,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			} as Notification;
			this.upsertLocal(incoming);
		});
	}

	disconnectWS() {
		this.unsub?.();
		this.unsub = null;
	}

	async acknowledge(id: string) {
		await notificationsApi.acknowledge(id);
		this.items = this.items.map((n) =>
			n.id === id ? { ...n, acknowledged_at: new Date().toISOString() } : n
		);
	}

	async acknowledgeAll() {
		const ids = this.unread.map((n) => n.id);
		await notificationsApi.acknowledgeAll(ids);
		const now = new Date().toISOString();
		this.items = this.items.map((n) => ({ ...n, acknowledged_at: now }));
	}

	async remove(id: string) {
		await notificationsApi.delete(id);
		this.items = this.items.filter((n) => n.id !== id);
	}

	async clearDone() {
		await notificationsApi.clearAcknowledged();
		this.items = this.items.filter((n) => !n.acknowledged_at);
	}

	async clearAll() {
		const unreadIds = this.unread.map((n) => n.id);
		if (unreadIds.length > 0) await notificationsApi.acknowledgeAll(unreadIds);
		await notificationsApi.clearAcknowledged();
		this.items = [];
	}

	private upsertLocal(incoming: Notification) {
		const idx = this.items.findIndex((n) => n.id === incoming.id);
		if (idx >= 0) {
			this.items = [...this.items.slice(0, idx), incoming, ...this.items.slice(idx + 1)];
		} else {
			this.items = [incoming, ...this.items];
		}
	}
}

export const notificationsStore = new NotificationsStore();
