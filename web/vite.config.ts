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

    const devServerHost = env.VITE_DEV_HOST?.trim() || 'localhost';
    const devServerPort = env.VITE_DEV_PORT ? Number.parseInt(env.VITE_DEV_PORT, 10) : 5173;

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
            host: devServerHost,
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
                '/auth': 'http://localhost:8000',
                '/logo.svg': 'http://localhost:8000',
            },
        },
    };
});
