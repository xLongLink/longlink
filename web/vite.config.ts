import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const isSdkBuild = mode === 'sdk';
    const buildOutDir = isSdkBuild
        ? path.resolve(__dirname, '../sdk/longlink/.static/web')
        : path.resolve(__dirname, '../api/src/.static/web');

    const devServerPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173;

    return {
        plugins: [react(), tailwindcss()],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@xml': path.resolve(__dirname, './src/xml'),
            },
        },

        build: {
            outDir: buildOutDir,
            emptyOutDir: true,
        },

        server: {
            host: '0.0.0.0',
            port: devServerPort,
            proxy: {
                '/auth/oidc': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                },
                '/api': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                },
                '/login/oidc': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                },
                '/logout': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                },
                '/me': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                },
                '/sdk-api': {
                    target: 'http://localhost:1707',
                    changeOrigin: true,
                    rewrite: (requestPath) => requestPath.replace(/^\/sdk-api/, ''),
                },
            },
        },
    };
});
