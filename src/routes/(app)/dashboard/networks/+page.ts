import { networksApi } from '$lib/api/v1/networks';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const networks = await networksApi.list(fetch);
  return { networks };
};