import path from 'node:path';
import { siteUrl } from './src/site';
import type { Config } from '@react-router/dev/config';
import { documentationPaths } from './src/platform/docs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';

const requestedMode = import.meta.env.MODE;

// React Router's prerender preview reloads this config in production mode.
if (requestedMode === 'api' || requestedMode === 'sdk') {
    process.env.LONGLINK_WEB_TARGET = requestedMode;
}

const isSolution = process.env.LONGLINK_WEB_TARGET === 'sdk';
const prerenderPaths = [
    '/',
    '/blog',
    '/blog/introducing-longlink',
    '/login',
    '/pricing',
    '/terms',
    '/impressum',
    '/privacy',
    ...documentationPaths,
];
const publicPagePaths = prerenderPaths.filter((pagePath) => pagePath !== '/login');

/** Sitemap priorities signal the important pages to search engines. */
const publicPagePriorities: Record<string, number> = {
    '/': 1.0,
    '/blog/introducing-longlink': 0.9,
    '/blog': 0.8,
    '/docs': 0.8,
    '/pricing': 0.6,
};

/** Returns the sitemap priority for a public page, defaulting by section depth. */
function sitemapPriority(pagePath: string): number {
    // Prioritized marketing and documentation entry points keep their explicit weight.
    const priority = publicPagePriorities[pagePath];
    if (priority !== undefined) return priority;

    // Legal pages stay discoverable without competing with acquisition content.
    if (pagePath === '/terms' || pagePath === '/impressum' || pagePath === '/privacy') return 0.3;

    // Generated component references are numerous, so keep them below curated guides.
    if (pagePath.startsWith('/docs/sdk/views/')) return 0.4;

    // Everything else stays below the prioritized pages.
    return 0.5;
}
const outputDirectory = path.resolve(
    import.meta.dirname,
    isSolution ? '../sdk/longlink/.static/web' : '../api/src/.static/web'
);

export default {
    appDirectory: isSolution ? 'src/solution' : 'src/platform',
    buildDirectory: path.resolve(import.meta.dirname, 'build', isSolution ? 'sdk' : 'api'),
    ssr: false,
    prerender: isSolution ? undefined : prerenderPaths.map((pagePath) => (pagePath === '/' ? '/' : `${pagePath}/`)),

    /** Adapts Framework Mode's output to the embedded FastAPI frontend contract. */
    async buildEnd({ reactRouterConfig }) {
        const clientDirectory = path.join(reactRouterConfig.buildDirectory, 'client');

        // Solutions do not publish Platform images.
        if (isSolution) {
            await rm(path.join(clientDirectory, 'images'), { force: true, recursive: true });
        } else {
            // Generate crawler configuration from the same inventory used for prerendering.
            const urls = publicPagePaths
                .map(
                    (pagePath) =>
                        `    <url><loc>${new URL(pagePath === '/' ? '/' : `${pagePath}/`, siteUrl).href}</loc><priority>${sitemapPriority(pagePath).toFixed(1)}</priority></url>`
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
