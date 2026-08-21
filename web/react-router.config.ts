import path from 'node:path';
import type { Config } from '@react-router/dev/config';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';

const requestedMode = import.meta.env.MODE;

// React Router's prerender preview reloads this config in production mode.
if (requestedMode === 'api' || requestedMode === 'sdk') {
    process.env.LONGLINK_WEB_TARGET = requestedMode;
}

const isApplication = process.env.LONGLINK_WEB_TARGET === 'sdk';
const publicPagePaths = [
    '/',
    '/pricing',
    '/terms',
    '/impressum',
    '/privacy',
    '/docs',
    '/docs/api',
    '/docs/api/applications',
    '/docs/api/organizations',
    '/docs/sdk',
    '/docs/sdk/building',
    '/docs/sdk/database',
    '/docs/sdk/environments',
    '/docs/sdk/routes',
    '/docs/sdk/storage',
    '/docs/sdk/testing',
    '/docs/sdk/pages',
    '/docs/sdk/pages/action',
    '/docs/sdk/pages/avatar',
    '/docs/sdk/pages/badge',
    '/docs/sdk/pages/bindings',
    '/docs/sdk/pages/button',
    '/docs/sdk/pages/card',
    '/docs/sdk/pages/checkbox-input',
    '/docs/sdk/pages/dialog',
    '/docs/sdk/pages/divider',
    '/docs/sdk/pages/expressions',
    '/docs/sdk/pages/file-input',
    '/docs/sdk/pages/for',
    '/docs/sdk/pages/grid',
    '/docs/sdk/pages/heading',
    '/docs/sdk/pages/icon',
    '/docs/sdk/pages/link',
    '/docs/sdk/pages/menu',
    '/docs/sdk/pages/number-input',
    '/docs/sdk/pages/query',
    '/docs/sdk/pages/radio-list',
    '/docs/sdk/pages/selector',
    '/docs/sdk/pages/slider',
    '/docs/sdk/pages/stack',
    '/docs/sdk/pages/state',
    '/docs/sdk/pages/switch',
    '/docs/sdk/pages/tabs',
    '/docs/sdk/pages/table',
    '/docs/sdk/pages/text',
    '/docs/sdk/pages/text-area',
    '/docs/sdk/pages/text-input',
];
const outputDirectory = path.resolve(
    import.meta.dirname,
    isApplication ? '../sdk/longlink/.static/web' : '../api/src/.static/web'
);

export default {
    appDirectory: isApplication ? 'src/application' : 'src/platform',
    buildDirectory: path.resolve(import.meta.dirname, 'build', isApplication ? 'sdk' : 'api'),
    ssr: false,
    prerender: isApplication ? undefined : publicPagePaths.map((pagePath) => (pagePath === '/' ? '/' : `${pagePath}/`)),

    /** Adapts Framework Mode's output to the embedded FastAPI frontend contract. */
    async buildEnd({ reactRouterConfig }) {
        const clientDirectory = path.join(reactRouterConfig.buildDirectory, 'client');

        // Applications do not publish Platform crawler configuration.
        if (isApplication) {
            await Promise.all([
                rm(path.join(clientDirectory, 'robots.txt'), { force: true }),
                rm(path.join(clientDirectory, 'sitemap.xml'), { force: true }),
            ]);
        } else {
            // Generate crawler URLs from the same inventory used for prerendering.
            const urls = publicPagePaths
                .map(
                    (pagePath) =>
                        `    <url><loc>${import.meta.env.VITE_SITE_URL}${pagePath === '/' ? '/' : `${pagePath}/`}</loc></url>`
                )
                .join('\n');
            await writeFile(
                path.join(clientDirectory, 'sitemap.xml'),
                `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
            );

            // Keep the prerendered home page while making the generic SPA document FastAPI's fallback.
            await rename(path.join(clientDirectory, 'index.html'), path.join(clientDirectory, '__root.html'));
            await rename(path.join(clientDirectory, '__spa-fallback.html'), path.join(clientDirectory, 'index.html'));
        }

        // Publish only browser assets into the Python package tree.
        await rm(outputDirectory, { force: true, recursive: true });
        await mkdir(path.dirname(outputDirectory), { recursive: true });
        await rename(clientDirectory, outputDirectory);
    },
} satisfies Config;
