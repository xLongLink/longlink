import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const isSDK = mode === 'sdk';
    const isApi = mode === 'api';
    const devServerTarget = isSDK ? 'http://localhost:1707' : 'http://localhost:8000';
    const devServerPort = isSDK ? 5174 : 5173;

    return {
        root: path.resolve(__dirname, isSDK ? 'sdk' : 'api'),

        plugins: [react(), tailwindcss()],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        build: {
            outDir: path.resolve(__dirname, isSDK ? '../sdk/longlink/static' : '../api/static'),
            emptyOutDir: true,
        },

        server: isApi || isSDK
            ? {
                  host: '0.0.0.0',
                  port: devServerPort,
                  proxy: {
                      '/api': {
                          target: devServerTarget,
                          changeOrigin: true,
                          rewrite: (requestPath) => requestPath.replace(/^\/api/, ''),
                      },
                  },
              }
            : undefined,
    };
});
