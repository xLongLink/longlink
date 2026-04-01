import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
    const isSDK = mode === 'sdk';

    return {
        root: path.resolve(__dirname, isSDK ? 'sdk' : 'api'),

        plugins: [react(), tailwindcss()],

        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        build: {
            outDir: path.resolve(
                __dirname,
                isSDK ? '../sdk/longlink/static' : '../api/static'
            ),
            emptyOutDir: true,
        },
    };
});
