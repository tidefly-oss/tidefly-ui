import { type Project, type CreateProjectRequest, type UpdateProjectRequest, type Container } from '$lib/api/v1/types';
import {projectsApi} from "$lib/api";

function createProjectsStore() {
	let projects        = $state<Project[]>([]);
	let loading         = $state(false);
	let error           = $state<string | null>(null);
	let containersCache = $state<Record<string, Container[]>>({});
	let loaded          = false; // internes Flag, nicht reaktiv nötig

	async function load(force = false) {
		if (loading) return;           // läuft bereits → nicht doppelt feuern
		if (loaded && !force) return;  // schon geladen → kein zweiter Request
		loading = true;
		error   = null;
		try {
			projects = await projectsApi.list();
			loaded   = true;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load projects';
		} finally {
			loading = false;
		}
	}

	async function get(id: string): Promise<Project> {
		const cached = projects.find((p) => p.id === id);
		if (cached) return cached;
		const p = await projectsApi.get(id);
		projects = [...projects.filter((x) => x.id !== id), p];
		return p;
	}

	async function create(body: CreateProjectRequest): Promise<Project> {
		const p = await projectsApi.create(body);
		projects = [...projects, p];
		return p;
	}

	async function update(id: string, body: UpdateProjectRequest): Promise<Project> {
		const p = await projectsApi.update(id, body);
		projects = projects.map((x) => (x.id === id ? p : x));
		return p;
	}

	async function remove(id: string) {
		await projectsApi.delete(id);
		projects = projects.filter((p) => p.id !== id);
		delete containersCache[id];
	}

	async function listContainers(id: string, force = false): Promise<Container[]> {
		if (!force && containersCache[id]) return containersCache[id]; // Cache nutzen
		const c = await projectsApi.listContainers(id);
		containersCache[id] = c;
		return c;
	}

	function invalidateContainers(id?: string) {
		if (id) delete containersCache[id];
		else containersCache = {};
	}

	return {
		get projects()        { return projects; },
		get loading()         { return loading; },
		get error()           { return error; },
		get containersCache() { return containersCache; },
		load,
		get,
		create,
		update,
		remove,
		listContainers,
		invalidateContainers
	};
}

export const projectsStore = createProjectsStore();