import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { reactRouter } from '@react-router/dev/vite';

const ignoredPaths = [
    '.react-router/**',
    'build/**',
    'scripts/**',
    'src/lib/generated/**',
    '.agent/**',
    '.agents/**',
    '.claude/**',
    '.codex/**',
    '.continue/**',
    '.cursor/**',
    '.gemini/**',
    '.opencode/**',
    '.pi/**',
    '.roo/**',
    '.windsurf/**',
    'tools/oxlint/anti-slop/**',
];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');

    const devServerHost = env.VITE_DEV_HOST?.trim() || 'localhost';
    const devServerPort = env.VITE_DEV_PORT ? Number.parseInt(env.VITE_DEV_PORT, 10) : 5173;

    return {
        // Keep code-level test servers from replacing the running dev server's optimized dependencies.
        cacheDir: mode === 'test' ? 'node_modules/.vite-test' : 'node_modules/.vite',
        plugins: [...tailwindcss(), ...(mode === 'test' ? [] : reactRouter())],

        fmt: {
            arrowParens: 'always',
            ignorePatterns: ignoredPaths,
            printWidth: 120,
            semi: true,
            singleQuote: true,
            sortImports: false,
            sortPackageJson: false,
            tabWidth: 4,
            trailingComma: 'es5',
        },

        lint: {
            categories: {
                correctness: 'error',
            },
            env: {
                browser: true,
                builtin: true,
                es2020: true,
            },
            ignorePatterns: ignoredPaths,
            options: {
                typeAware: true,
                typeCheck: true,
            },
            jsPlugins: [
                'eslint-plugin-perfectionist',
                { name: 'anti-slop', specifier: './tools/oxlint/anti-slop/index.ts' },
            ],
            plugins: ['oxc', 'typescript', 'unicorn', 'react'],
            rules: {
                'oxc/no-accumulating-spread': 'error',
                'anti-slop/no-array-filter-map': 'error',
                'anti-slop/no-reduce-accumulator-copy': 'error',
                'anti-slop/no-chained-type-assertions': 'error',
                'anti-slop/no-conditional-empty-object-spread': 'error',
                'anti-slop/no-known-value-widening': 'error',
                'anti-slop/no-module-mocking': 'error',
                'anti-slop/no-object-parameters': 'error',
                'anti-slop/no-reflect-apply': 'error',
                'anti-slop/no-reflect-get': 'error',
                'anti-slop/no-runtime-typeof': 'error',
                'anti-slop/no-shape-in-symbol-names': 'error',
                'anti-slop/no-unknown-parameters': 'error',
                'anti-slop/no-unknown-returns': 'error',
                'anti-slop/no-unknown-type-aliases': 'error',
                'anti-slop/no-unsafe-dictionary-type': 'error',
                'anti-slop/no-widen-then-assert': 'error',
                'anti-slop/require-readable-spacing': 'error',
                'anti-slop/require-safety-comment-for-type-assertion': 'error',
                'perfectionist/sort-imports': [
                    'error',
                    {
                        fallbackSort: { type: 'alphabetical' },
                        groups: ['import'],
                        newlinesBetween: 0,
                        order: 'asc',
                        type: 'line-length',
                    },
                ],
                'react/no-children-prop': 'off',
                'react/no-did-update-set-state': 'off',
                'react/exhaustive-deps': 'warn',
                'react/only-export-components': 'off',
                'react/rules-of-hooks': 'error',
                'typescript/await-thenable': 'off',
                'typescript/no-base-to-string': 'off',
                'typescript/no-explicit-any': 'error',
                'typescript/no-floating-promises': 'error',
                'typescript/no-misused-promises': 'error',
                'typescript/no-non-null-assertion': 'error',
                'typescript/no-redundant-type-constituents': 'off',
                'typescript/no-unnecessary-type-assertion': 'error',
                'typescript/no-unsafe-assignment': 'error',
                'typescript/unbound-method': 'off',
                'react/no-array-index-key': 'error',
            },
        },

        envPrefix: ['VITE_', 'VERSION'],

        resolve: {
            tsconfigPaths: true,
        },

        server: {
            host: devServerHost,
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
            },
        },

        // Keep React Router's build-time preview request on the socket Vite binds in containers.
        preview: {
            host: '127.0.0.1',
        },
    };
});
