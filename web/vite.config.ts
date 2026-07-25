import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const devServerHost = env.VITE_DEV_HOST?.trim() || 'localhost';
    const devServerPort = env.VITE_DEV_PORT ? Number.parseInt(env.VITE_DEV_PORT, 10) : 5173;

    return {
        plugins: [tailwindcss(), reactRouter()],

        envPrefix: ['VITE_', 'VERSION'],

        resolve: {
            tsconfigPaths: true,
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        server: {
            host: devServerHost,
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
                '/logo.svg': 'http://localhost:8000',
            },
        },

        // Keep React Router's build-time preview request on the socket Vite binds in containers.
        preview: {
            host: '127.0.0.1',
        },
    };
});
