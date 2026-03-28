import { imagesApi } from '$lib/api/v1/images';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const images = await imagesApi.list(fetch);
  return { images };
};