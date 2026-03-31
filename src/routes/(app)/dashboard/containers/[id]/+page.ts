import { containersApi } from "$lib/api/v1/containers";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ params, fetch }) => {
	const container = await containersApi.get(params.id, fetch);
	return { container };
};
