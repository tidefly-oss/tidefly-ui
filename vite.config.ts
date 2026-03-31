import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
    return {
        plugins: [tailwindcss(), sveltekit()],
        server: {
            ...(mode === 'development' && {
                proxy: {
                    '/api': {
                        target: 'http://localhost:8181',
                        changeOrigin: true,
                        ws: true,
                    },
                },
            }),
        },
    };
});