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
    '.windsurf/**'
];

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), 'VITE_');

    const devServerHost = env.VITE_DEV_HOST?.trim() || 'localhost';
    const devServerPort = env.VITE_DEV_PORT ? Number.parseInt(env.VITE_DEV_PORT, 10) : 5173;

    return {
        // Isolate Platform, SDK, and test dependency optimization from each other and default-cache tooling.
        cacheDir: `node_modules/.vite-${mode}`,
        plugins: [...tailwindcss(), ...(mode === 'test' ? [] : reactRouter())],

        fmt: {
            arrowParens: 'always',
            ignorePatterns: ignoredPaths,
            objectWrap: 'collapse',
            printWidth: 120,
            semi: true,
            singleQuote: true,
            sortImports: false,
            sortPackageJson: false,
            tabWidth: 4,
            trailingComma: 'none'
        },

        lint: {
            categories: { correctness: 'error' },
            env: { browser: true, builtin: true, es2020: true },
            ignorePatterns: ignoredPaths,
            options: { typeAware: true, typeCheck: true },
            jsPlugins: ['eslint-plugin-perfectionist'],
            plugins: ['oxc', 'typescript', 'unicorn', 'react'],
            overrides: [
                // Keep registry code upstream-compatible without applying LongLink's authoring conventions.
                {
                    files: ['src/components/reui/**/*', 'src/components/mapcn/**/*'],
                    rules: {
                        'react/exhaustive-deps': 'warn',
                        'typescript/no-base-to-string': 'off',
                        'react/rules-of-hooks': 'error',
                        'react/refs': 'off',
                        'react/immutability': 'off',
                        'react/set-state-in-effect': 'off'
                    }
                },
                {
                    files: ['src/components/shadcn/**/*', 'src/components/reui/**/*', 'src/components/mapcn/**/*'],
                    rules: {
                        'no-restricted-imports': [
                            'error',
                            {
                                patterns: [
                                    {
                                        group: [
                                            '@/lib/view-capabilities',
                                            '**/lib/view-capabilities',
                                            '@/platform/**',
                                            '@/solution/**',
                                            '@/components/longlink/**',
                                            '@/views/**',
                                            '@/components/ui/*',
                                            '../ui/*',
                                            '../../ui/*'
                                        ],
                                        message:
                                            'Library components must not depend on View runtime contexts or application UI components.'
                                    }
                                ]
                            }
                        ]
                    }
                },
                {
                    files: ['src/components/longlink/**/*'],
                    rules: {
                        'no-restricted-imports': [
                            'error',
                            { patterns: ['@/platform/**', '@/solution/**', '@/views/**', '@/components/ui/**'] }
                        ]
                    }
                },
                {
                    files: ['src/lib/view-capabilities.ts'],
                    rules: {
                        'no-restricted-imports': [
                            'error',
                            {
                                patterns: [
                                    {
                                        group: ['@/components/ui/*', '**/components/ui/*', '../ui/*'],
                                        message: 'View runtime contexts must not depend on application UI components.'
                                    }
                                ]
                            }
                        ]
                    }
                },
                {
                    files: ['**/*'],
                    excludeFiles: ['src/components/reui/**/*', 'src/components/mapcn/**/*'],
                    rules: {
                        'oxc/no-accumulating-spread': 'error',
                        'perfectionist/sort-imports': [
                            'error',
                            {
                                fallbackSort: { type: 'alphabetical' },
                                groups: ['import'],
                                newlinesBetween: 0,
                                order: 'asc',
                                type: 'line-length'
                            }
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
                        'react/no-array-index-key': 'error'
                    }
                }
            ]
        },

        envPrefix: ['VITE_', 'VERSION'],

        build: {
            assetsDir: mode === 'sdk' ? '_longlink/assets' : 'assets',
            rolldownOptions: { checks: { moduleLevelDirective: false } }
        },

        resolve: { tsconfigPaths: true },

        server: {
            host: devServerHost,
            port: devServerPort,
            strictPort: true,

            // Route API calls and canonical MCP resource discovery to the local backend.
            proxy: { '/api': 'http://localhost:8000', '/.well-known/oauth-protected-resource': 'http://localhost:8000' }
        },

        // Keep React Router's build-time preview request on the socket Vite binds in containers.
        preview: { host: '127.0.0.1' }
    };
});
