import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: '../api/openapi/v1.json',
    output: {
        indexFile: false,
        path: 'src/lib/generated/platform-api-v1',
    },
    plugins: ['@hey-api/typescript', { name: 'zod', compatibilityVersion: 4 }],
});
