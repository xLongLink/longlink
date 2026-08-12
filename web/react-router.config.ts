import type { Config } from '@react-router/dev/config';
import path from 'node:path';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { documentationPublicPages } from './src/platform/docs/pages';
import { homePage, legalPages, pricingPage, publicRoutePath, SITE_URL } from './src/platform/public';

const requestedMode = import.meta.env.MODE;

// React Router's prerender preview reloads this config in production mode.
if (requestedMode === 'api' || requestedMode === 'sdk') {
    process.env.LONGLINK_WEB_TARGET = requestedMode;
}

const isApplication = process.env.LONGLINK_WEB_TARGET === 'sdk';
const publicPagePaths = [homePage, pricingPage, ...documentationPublicPages, ...Object.values(legalPages)].map(
    ({ path }) => path
);
const outputDirectory = path.resolve(
    import.meta.dirname,
    isApplication ? '../sdk/longlink/.static/web' : '../api/src/.static/web'
);

export default {
    appDirectory: isApplication ? 'src/application' : 'src/platform',
    buildDirectory: path.resolve(import.meta.dirname, 'build', isApplication ? 'sdk' : 'api'),
    ssr: false,
    prerender: isApplication ? undefined : publicPagePaths.map(publicRoutePath),

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
                .map((pagePath) => `    <url><loc>${SITE_URL}${publicRoutePath(pagePath)}</loc></url>`)
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
