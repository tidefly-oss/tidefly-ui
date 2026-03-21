import tailwindcss from '@tailwindcss/vite';
import {sveltekit} from '@sveltejs/kit/vite';
import {defineConfig, loadEnv} from 'vite';
import * as process from "node:process";

export default defineConfig(({mode}) => {
    const env = loadEnv(mode, process.cwd(), '');

    const BACKEND = env.VITE_API_URL || 'http://localhost:8181';

    return {
        plugins: [tailwindcss(), sveltekit()],
        server: {
            proxy: {
                '/api': {
                    target: 'http://localhost:8181',
                    changeOrigin: true,
                },
            },
        },
    };
});