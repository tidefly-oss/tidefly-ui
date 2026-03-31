import { volumesApi } from "$lib/api/v1/volumes";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
	const volumes = await volumesApi.list(fetch);
	return { volumes };
};
