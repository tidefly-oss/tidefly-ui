import { api } from "$lib/api";
import type { Notification, NotificationCount } from "$lib/api/v1/types";

const BASE = "/api/v1/notifications";

export const notificationsApi = {
	list: () => api.get<Notification[]>(`${BASE}`),
	listAll: () => api.get<Notification[]>(`${BASE}/all`),
	count: () => api.get<NotificationCount>(`${BASE}/count`),
	acknowledge: (id: string) => api.post<void>(`${BASE}/${id}/acknowledge`),
	acknowledgeAll: (ids: string[]) =>
		Promise.all(ids.map((id) => api.post<void>(`${BASE}/${id}/acknowledge`))),
	delete: (id: string) => api.delete<void>(`${BASE}/${id}`),
	clearAcknowledged: () => api.delete<void>(`${BASE}/acknowledged`),
};
