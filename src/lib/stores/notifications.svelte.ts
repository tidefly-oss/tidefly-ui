import { notificationsApi } from '$lib/api/v1/notifications/index.js'
import type { Notification } from '$lib/api/v1/types'

const base = import.meta.env.VITE_API_URL ?? '';

class NotificationsStore {
	items = $state<Notification[]>([])
	loading = $state(false)
	error = $state<string | null>(null)

	get unread(): Notification[] {
		return this.items.filter((n) => !n.acknowledged_at)
	}

	get unreadCount(): number {
		return this.unread.length
	}

	private sseSource: EventSource | null = null

	connectSSE() {
		if (this.sseSource) return

		const source = new EventSource(`${base}/api/v1/notifications/stream`, {
			withCredentials: true
		})

		source.addEventListener('notification', (e: MessageEvent) => {
			try {
				const notification: Notification = JSON.parse(e.data)
				this.upsertLocal(notification)
			} catch {
				// ignore malformed events
			}
		})

		source.addEventListener('ping', () => {})
		source.onerror = () => {}

		this.sseSource = source
	}

	disconnectSSE() {
		this.sseSource?.close()
		this.sseSource = null
	}

    async load() {
        this.loading = true
        this.error = null
        try {
            this.items = await notificationsApi.list()
        } catch (e) {
            this.error = e instanceof Error ? e.message : 'Failed to load notifications'
        } finally {
            this.loading = false
        }
    }

	async acknowledge(id: string) {
		await notificationsApi.acknowledge(id)
		this.items = this.items.map((n) =>
			n.id === id ? { ...n, acknowledged_at: new Date().toISOString() } : n
		)
	}

	async acknowledgeAll() {
		const ids = this.unread.map((n) => n.id)
		await notificationsApi.acknowledgeAll(ids)  // passes IDs to fan-out
		const now = new Date().toISOString()
		this.items = this.items.map((n) => ({ ...n, acknowledged_at: now }))
	}

	async remove(id: string) {
		await notificationsApi.delete(id)
		this.items = this.items.filter((n) => n.id !== id)
	}

	async clearDone() {
		await notificationsApi.clearAcknowledged()
		this.items = this.items.filter((n) => !n.acknowledged_at)
	}

	private upsertLocal(incoming: Notification) {
		const idx = this.items.findIndex((n) => n.id === incoming.id)
		if (idx >= 0) {
			this.items = [
				...this.items.slice(0, idx),
				incoming,
				...this.items.slice(idx + 1)
			]
		} else {
			this.items = [incoming, ...this.items]
		}
	}
}

export const notificationsStore = new NotificationsStore()