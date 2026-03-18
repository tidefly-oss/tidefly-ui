import { deployApi } from '$lib/api/v1/deploy';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const services = await deployApi.list(fetch);
  return { services };
};