import { templatesApi } from '$lib/api/v1/templates';
import type { PageLoad } from './$types';
import {projectsApi} from "$lib/api";

export const load: PageLoad = async ({ fetch }) => {
  const [summaries, projects] = await Promise.all([
    templatesApi.list(fetch),
    projectsApi.list(fetch),
  ]);
  return { summaries, projects };
};