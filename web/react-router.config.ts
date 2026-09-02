import path from 'node:path';
import type { Config } from '@react-router/dev/config';
import { documentationPaths } from './src/platform/docs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';

const requestedMode = import.meta.env.MODE;

// React Router's prerender preview reloads this config in production mode.
if (requestedMode === 'api' || requestedMode === 'sdk') {
    process.env.LONGLINK_WEB_TARGET = requestedMode;
}

const isSolution = process.env.LONGLINK_WEB_TARGET === 'sdk';
const publicPagePaths = ['/', '/pricing', '/terms', '/impressum', '/privacy', ...documentationPaths];
const outputDirectory = path.resolve(
    import.meta.dirname,
    isSolution ? '../sdk/longlink/.static/web' : '../api/src/.static/web'
);

export default {
    appDirectory: isSolution ? 'src/solution' : 'src/platform',
    buildDirectory: path.resolve(import.meta.dirname, 'build', isSolution ? 'sdk' : 'api'),
    ssr: false,
    prerender: isSolution ? undefined : publicPagePaths.map((pagePath) => (pagePath === '/' ? '/' : `${pagePath}/`)),

    /** Adapts Framework Mode's output to the embedded FastAPI frontend contract. */
    async buildEnd({ reactRouterConfig }) {
        const clientDirectory = path.join(reactRouterConfig.buildDirectory, 'client');

        // Solutions do not publish Platform images.
        if (isSolution) {
            await rm(path.join(clientDirectory, 'images'), { force: true, recursive: true });
        } else {
            // Generate crawler configuration from the same inventory used for prerendering.
            const configuredSiteUrl = import.meta.env.VITE_SITE_URL ?? 'https://longlink.dev';
            const siteUrl = new URL(configuredSiteUrl);
            if (siteUrl.pathname !== '/' || siteUrl.search || siteUrl.hash) {
                throw new Error('VITE_SITE_URL must contain only the public site origin.');
            }

            const urls = publicPagePaths
                .map(
                    (pagePath) =>
                        `    <url><loc>${new URL(pagePath === '/' ? '/' : `${pagePath}/`, siteUrl).href}</loc></url>`
                )
                .join('\n');
            await writeFile(
                path.join(clientDirectory, 'sitemap.xml'),
                `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
            );
            await writeFile(
                path.join(clientDirectory, 'robots.txt'),
                `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', siteUrl).href}\n`
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
