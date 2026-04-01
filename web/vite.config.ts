import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, 'index.html'),
                api: path.resolve(__dirname, 'api.html'),
                sdk: path.resolve(__dirname, 'sdk.html'),
            },
        },
    },
});
