import ts from 'typescript';
import path from 'node:path';
import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import tailwindcss from '@tailwindcss/vite';
import { readFile, writeFile, readdir } from 'node:fs/promises';

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

                const [bootstrap, shim, styles] = await Promise.all([
                    readFile(path.resolve(import.meta.dirname, 'src/views/bootstrap.ts'), 'utf8'),
                    readFile(new URL(import.meta.resolve('es-module-shims')), 'utf8'),
                    readFile(path.join(directory, 'runtime.css'), 'utf8')
                ]);

                // Pin every module, including lazy chunks, to this Solution's packaged runtime.
                const modules: Record<string, string> = {};

                for (const file of (await readdir(directory, { recursive: true })).sort()) {
                    if (!file.endsWith('.js')) continue;
                    const bytes = await readFile(path.join(directory, file));
                    modules[file] = createHash('sha256').update(bytes).digest('hex');
                }

                const compiled = ts
                    .transpileModule(bootstrap, {
                        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
                    })
                    .outputText.replace(/export \{\};?\s*$/, '');
                const script = `${compiled}\n${shim}`;

                // The host verifies the same digest before executing Solution-owned assets in its sandbox.
                const version = createHash('sha256')
                    .update(`${script}\n${styles}\n${JSON.stringify(modules)}`)
                    .digest('hex');
                await writeFile(path.join(directory, 'runtime.js'), script);
                await writeFile(path.join(directory, 'runtime.json'), JSON.stringify({ version, modules }));
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
            formats: ['es'],
            fileName: () => 'entry.js',
            cssFileName: 'runtime'
        }
    }
});
