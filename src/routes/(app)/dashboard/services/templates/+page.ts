import { projectsApi } from "$lib/api";
import { templatesApi } from "$lib/api/v1/templates";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
	const [summaries, projects] = await Promise.all([
		templatesApi.list(fetch),
		projectsApi.list(fetch),
	]);
	return { summaries, projects };
};
