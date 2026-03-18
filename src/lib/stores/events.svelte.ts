import { getQueryClient } from '$lib/query';
import type { ContainerStatus } from '$lib/api/v1/types';

type ContainerEventType =
  | 'start' | 'stop' | 'die' | 'kill'
  | 'restart' | 'pause' | 'unpause'
  | 'destroy' | 'create' | 'oom';

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
    const source = new EventSource('http://localhost:8181/api/v1/events/stream', { withCredentials: true });

    source.addEventListener('container', (e: MessageEvent) => {
      try {
        const evt: ContainerEvent = JSON.parse(e.data);
        this._handleEvent(evt);
      } catch {}
    });

    source.addEventListener('error', () => {
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
      start: 'running', unpause: 'running', restart: 'running',
      stop: 'exited', die: 'exited', kill: 'exited', oom: 'exited',
      pause: 'paused',
    };

    if (evt.type === 'destroy') {
      qc.invalidateQueries({ queryKey: ['containers'] });
      return;
    }

    if (evt.type === 'create') {
      qc.invalidateQueries({ queryKey: ['containers'] });
      return;
    }

    const newStatus = statusMap[evt.type];
    if (newStatus) {
      // Optimistic update im Cache
      qc.setQueryData<{ id: string; status: ContainerStatus }[]>(
        ['containers'],
        (old) => old?.map((c) => c.id === evt.container_id ? { ...c, status: newStatus } : c) ?? [],
      );
      qc.setQueryData<{ id: string; status: ContainerStatus }>(
        ['container', evt.container_id],
        (old) => old ? { ...old, status: newStatus } : old,
      );
    }
  }
}

export const dockerEventsStore = new DockerEventsStore();