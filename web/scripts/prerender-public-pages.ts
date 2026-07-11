import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { publicSeoPages, SITE_URL, type PublicSeoPage } from '../src/lib/seo';
import { render } from '../src/entry-server';

const outputDirectory = path.resolve(import.meta.dir, '../../api/src/.static/web');

/** Escapes text before inserting it into an HTML attribute. */
function escapeHtmlAttribute(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}


/** Returns the output file path for one public route. */
function routeOutputPath(routePath: string): string {
    if (routePath === '/') {
        return path.join(outputDirectory, 'index.html');
    }

    return path.join(outputDirectory, routePath.replace(/^\//, ''), 'index.html');
}


/** Injects route-specific metadata and prerendered app content into the built shell. */
function renderHtml(shell: string, page: PublicSeoPage): string {
    const canonicalUrl = `${SITE_URL}${page.path === '/' ? '/' : page.path}`;
    const title = escapeHtmlAttribute(page.title);
    const description = escapeHtmlAttribute(page.description);
    const structuredData =
        page.path === '/'
            ? JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                      name: 'LongLink',
                      url: canonicalUrl,
                      hasPart: [
                      { '@type': 'SiteNavigationElement', name: 'Pricing', url: `${SITE_URL}/pricing` },
                      { '@type': 'SiteNavigationElement', name: 'Documentation', url: `${SITE_URL}/docs` },
                      { '@type': 'SiteNavigationElement', name: 'Application SDK Docs', url: `${SITE_URL}/docs/sdk` },
                      { '@type': 'SiteNavigationElement', name: 'Control Plane Docs', url: `${SITE_URL}/docs/api` },
                  ],
              })
            : JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': page.path.startsWith('/docs') ? 'TechArticle' : 'WebPage',
                  name: page.title,
                  description: page.description,
                  url: canonicalUrl,
              });
    const seoHead = `<meta name="description" content="${description}" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="${canonicalUrl}" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${canonicalUrl}" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <script type="application/ld+json">${structuredData}</script>
        <title>${title}</title>`;

    return shell
        .replace(/<title>.*?<\/title>/, seoHead)
        .replace('<div id="root"></div>', `<div id="root">${render(page.path)}</div>`);
}


/** Writes prerendered HTML files for all public search pages. */
async function main(): Promise<void> {
    const shell = await readFile(path.join(outputDirectory, 'index.html'), 'utf8');

    for (const page of publicSeoPages) {
        const html = renderHtml(shell, page);
        const filePath = routeOutputPath(page.path);

        await mkdir(path.dirname(filePath), { recursive: true });
        await writeFile(filePath, html);
    }
}

await main();
