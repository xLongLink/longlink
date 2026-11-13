import path from 'node:path';
import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import { readFile, writeFile } from 'node:fs/promises';

export default defineConfig({
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    publicDir: false,
    plugins: [
        tailwindcss(),
        {
            name: 'view-runtime-manifest',

            /** Pin the complete component runtime and styles to their packaged content. */
            async closeBundle() {
                const directory = path.resolve(import.meta.dirname, 'build/views');

                const [script, styles] = await Promise.all([
                    readFile(path.join(directory, 'runtime.js'), 'utf8'),
                    readFile(path.join(directory, 'runtime.css'), 'utf8')
                ]);

                // The host verifies the same digest before executing Solution-owned assets in its sandbox.
                const version = createHash('sha256').update(`${script}\n${styles}`).digest('hex');
                await writeFile(path.join(directory, 'runtime.json'), JSON.stringify({ version }));
            }
        }
    ],
    resolve: { tsconfigPaths: true },
    build: {
        rolldownOptions: { checks: { moduleLevelDirective: false } },
        outDir: 'build/views',
        emptyOutDir: true,
        lib: {
            entry: path.resolve(import.meta.dirname, 'src/views/runtime.tsx'),
            name: 'LongLinkView',
            formats: ['iife'],
            fileName: () => 'runtime.js',
            cssFileName: 'runtime'
        }
    }
});
