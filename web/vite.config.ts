import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

/** Resolves the bundle output directory for one Vite mode. */
export function resolveBuildOutDir(mode: string): string {
    return mode === 'sdk'
        ? path.resolve(__dirname, '../sdk/longlink/.static/web')
        : path.resolve(__dirname, '../api/src/.static/web');
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const devServerPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173;

    return {
        plugins: [react(), tailwindcss()],

        envPrefix: ['VITE_', 'VERSION'],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        build: {
            outDir: resolveBuildOutDir(mode),
            emptyOutDir: true,
        },

        server: {
            host: '0.0.0.0',
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
                '/auth': 'http://localhost:8000',
                '/logo.svg': 'http://localhost:8000',
            },
        },
    };
});
