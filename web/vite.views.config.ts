import path from 'node:path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    publicDir: false,
    plugins: [tailwindcss()],
    resolve: { tsconfigPaths: true },
    build: {
        outDir: 'public/views',
        emptyOutDir: false,
        lib: {
            entry: path.resolve(import.meta.dirname, 'src/views/runtime.tsx'),
            name: 'LongLinkView',
            formats: ['iife'],
            fileName: () => 'runtime.js',
            cssFileName: 'runtime',
        },
    },
});
