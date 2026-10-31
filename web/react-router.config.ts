import path from 'node:path';
import { siteUrl } from './src/site';
import type { Config } from '@react-router/dev/config';
import { cp, mkdir, rename, rm, writeFile } from 'node:fs/promises';

const requestedMode = import.meta.env.MODE;

// React Router's prerender preview reloads this config in production mode.
if (requestedMode === 'api' || requestedMode === 'sdk') {
    process.env.LONGLINK_WEB_TARGET = requestedMode;
}

const isSolution = process.env.LONGLINK_WEB_TARGET === 'sdk';

// Only Platform builds need the documentation catalog for publication paths.
const { legalPaths, brandingPaths, documentationPaths } = isSolution
    ? { legalPaths: [], brandingPaths: [], documentationPaths: [] }
    : await import('./src/platform/routes');

const publicPagePaths = [
    '/',
    '/login',
    '/pricing',
    '/blog',
    '/blog/why-longlink',
    ...legalPaths,
    ...brandingPaths,
    ...documentationPaths,
];

const outputDirectory = path.resolve(
    import.meta.dirname,
    isSolution ? '../sdk/longlink/.static/web' : '../api/src/.static/web'
);

export default {
    appDirectory: isSolution ? 'src/solution' : 'src/platform',
    buildDirectory: path.resolve(import.meta.dirname, 'build', isSolution ? 'sdk' : 'api'),
    ssr: false,

    // Discover route dependencies before serving modules instead of re-optimizing them during page loading.
    future: { unstable_optimizeDeps: true },
    prerender: isSolution
        ? undefined
        : [...publicPagePaths, '/404'].map((pagePath) => (pagePath === '/' ? '/' : `${pagePath}/`)),

    /** Adapts Framework Mode's output to the embedded FastAPI frontend contract. */
    async buildEnd({ reactRouterConfig }) {
        const clientDirectory = path.join(reactRouterConfig.buildDirectory, 'client');

        // Package the component runtime only with the SDK that owns it.
        if (isSolution) {
            await cp(path.join(import.meta.dirname, 'build/views'), path.join(clientDirectory, 'views'), {
                recursive: true,
            });

            // Solutions retain the shared wordmark without publishing Platform images or the public agent guide.
            await rm(path.join(clientDirectory, 'images'), { force: true, recursive: true });
            await rm(path.join(clientDirectory, 'llms.txt'), { force: true });

            // Include both theme variants used by the shared navigation header.
            await mkdir(path.join(clientDirectory, 'images'), { recursive: true });

            for (const mode of ['light', 'dark']) {
                const filename = `longlink-wordmark-${mode}.png`;
                await cp(
                    path.join(import.meta.dirname, 'public', 'images', filename),
                    path.join(clientDirectory, 'images', filename)
                );
            }
        } else {
            // Publish valid SPA paths from React Router so the server can reject unknown URLs.
            const routes = Object.values(reactRouterConfig.routes);
            const parentIds = new Set(routes.map((route) => route.parentId));

            // Exclude layouts and error routes from the application's valid page inventory.
            const spaPaths = routes.flatMap((route) => {
                if (parentIds.has(route.id) || route.file.endsWith('/NotFound.tsx')) return [];

                // Resolve layout and prefix segments before translating parameters for FastAPI.
                const segments = [];
                let currentRoute: typeof route | undefined = route;

                while (currentRoute) {
                    if (currentRoute.path) segments.unshift(currentRoute.path);
                    currentRoute = currentRoute.parentId ? reactRouterConfig.routes[currentRoute.parentId] : undefined;
                }

                const pagePath = `/${segments.join('/')}`;

                if (publicPagePaths.includes(pagePath)) return [];

                // React Router splats also match the Solution root without a trailing slash.
                const paths = pagePath.endsWith('/*') ? [pagePath.slice(0, -2), pagePath] : [pagePath];

                return paths.map((routePath) => routePath.replace(/:([^/]+)/g, '{$1}').replace(/\*/g, '{path:path}'));
            });

            await writeFile(path.join(clientDirectory, 'spa.json'), JSON.stringify(spaPaths));

            // Generate crawler configuration from prerendered pages, excluding login.
            const urls = publicPagePaths
                .flatMap((pagePath) =>
                    pagePath === '/login'
                        ? []
                        : [
                              `    <url><loc>${new URL(pagePath === '/' ? '/' : `${pagePath}/`, siteUrl).href}</loc></url>`,
                          ]
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

            // Keep the prerendered home page and the generic document for known SPA routes.
            await rename(path.join(clientDirectory, 'index.html'), path.join(clientDirectory, '__root.html'));
            await rename(path.join(clientDirectory, '__spa-fallback.html'), path.join(clientDirectory, 'index.html'));

            // FastAPI's static frontend serves this prerendered document with HTTP 404.
            await rename(path.join(clientDirectory, '404', 'index.html'), path.join(clientDirectory, '404.html'));
        }

        // Publish only browser assets into the Python package tree.
        await rm(outputDirectory, { force: true, recursive: true });
        await mkdir(path.dirname(outputDirectory), { recursive: true });
        await rename(clientDirectory, outputDirectory);
    },
} satisfies Config;
