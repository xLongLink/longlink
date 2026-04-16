import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const isSdkBuild = mode === 'sdk';
    const isApiBuild = mode === 'api';

    const buildOutDir = isSdkBuild
        ? path.resolve(__dirname, '../sdk/longlink/static')
        : isApiBuild
          ? path.resolve(__dirname, '../api/static')
          : path.resolve(__dirname, './dist');

    const devServerPort = env.VITE_DEV_PORT ? parseInt(env.VITE_DEV_PORT) : 5173;

    return {
        plugins: [react(), tailwindcss()],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
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
                '/api': {
                    target: 'http://localhost:8000',
                    changeOrigin: true,
                    rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
                },
            },
        },
    };
});
