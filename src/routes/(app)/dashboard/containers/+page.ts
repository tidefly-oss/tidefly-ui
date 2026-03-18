import { containersApi } from '$lib/api/v1/containers';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const containers = await containersApi.list(true, fetch);
  return { containers };
};