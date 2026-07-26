import path from 'node:path';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, lazyPlugins, loadEnv } from 'vite-plus';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const devServerHost = env.VITE_DEV_HOST?.trim() || 'localhost';
    const devServerPort = env.VITE_DEV_PORT ? Number.parseInt(env.VITE_DEV_PORT, 10) : 5173;

    return {
        plugins: lazyPlugins(() => [...tailwindcss(), ...reactRouter()]),

        fmt: {
            arrowParens: 'always',
            ignorePatterns: ['.react-router/**', 'build/**', 'src/lib/generated/**'],
            printWidth: 120,
            semi: true,
            singleQuote: true,
            sortImports: {
                newlinesBetween: false,
            },
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
            ignorePatterns: ['.react-router/**', 'build/**', 'src/lib/generated/**'],
            options: {
                typeAware: true,
                typeCheck: true,
            },
            plugins: ['oxc', 'typescript', 'unicorn', 'react'],
            rules: {
                'react/no-children-prop': 'off',
                'react/no-did-update-set-state': 'off',
                'react/exhaustive-deps': 'warn',
                'react/only-export-components': 'off',
                'react/rules-of-hooks': 'error',
                'typescript/await-thenable': 'off',
                'typescript/no-base-to-string': 'off',
                'typescript/no-explicit-any': 'error',
                'typescript/no-floating-promises': 'off',
                'typescript/no-redundant-type-constituents': 'off',
                'typescript/unbound-method': 'off',
            },
        },

        test: {
            setupFiles: ['./tests/preload.ts'],
        },

        envPrefix: ['VITE_', 'VERSION'],

        resolve: {
            tsconfigPaths: true,
            alias: {
                '@': path.resolve(__dirname, './src'),
            },
        },

        server: {
            host: devServerHost,
            port: devServerPort,
            proxy: {
                '/api': 'http://localhost:8000',
                '/logo.svg': 'http://localhost:8000',
            },
        },

        // Keep React Router's build-time preview request on the socket Vite binds in containers.
        preview: {
            host: '127.0.0.1',
        },
    };
});
