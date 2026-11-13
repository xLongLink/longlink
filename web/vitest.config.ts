import { mergeConfig } from 'vite';
import { resolve } from 'node:path';
import viteConfig from './vite.config';
import { defineConfig } from 'vitest/config';

export default defineConfig((environment) =>
    mergeConfig(viteConfig(environment), { server: { fs: { allow: [resolve(import.meta.dirname, '..')] } } })
);
