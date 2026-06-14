import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
	const apiTarget = process.env.VITE_API_TARGET ?? "http://localhost:8181";

	return {
		plugins: [tailwindcss(), sveltekit()],
		cacheDir: "node_modules/.vite",
		server: {
			...(mode === "development" && {
				proxy: {
					"/api": {
						target: apiTarget,
						changeOrigin: true,
						ws: true,
					},
					"/webhooks": {
						target: apiTarget,
						changeOrigin: true,
					},
				},
			}),
		},
	};
});
