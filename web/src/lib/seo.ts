import type { MetaDescriptor } from 'react-router';

export type PublicSeoPage = {
    path: string;
    title: string;
    description: string;
};

export const SITE_URL = 'https://longlink.dev';

const descriptionsByPath: Record<string, string> = {
    '/docs': 'Learn how LongLink helps teams build and run structured business applications.',
    '/docs/api': 'Understand the LongLink Platform for organizations, applications, infrastructure, and operations.',
    '/docs/api/organizations': 'Learn how LongLink organizations, memberships, and access boundaries work.',
    '/docs/api/applications': 'Learn how LongLink registers, deploys, routes, and manages business applications.',
    '/docs/api/self-hosted':
        'Run the LongLink Platform with self-hosted infrastructure and required environment settings.',
    '/docs/sdk':
        'Build LongLink applications locally with the Python SDK, XML pages, routes, storage, and database tools.',
    '/docs/sdk/environments':
        'Configure LongLink applications for local development, testing, and production environments.',
    '/docs/sdk/routes': 'Add FastAPI routes to LongLink applications for APIs, actions, and process-specific behavior.',
    '/docs/sdk/storage':
        'Use LongLink storage abstractions across local filesystems, tests, and production object storage.',
    '/docs/sdk/database': 'Use LongLink database helpers and migrations for application-owned data models.',
    '/docs/sdk/testing': 'Test LongLink applications with isolated runtime configuration and Python testing workflows.',
    '/docs/sdk/building':
        'Package LongLink applications into deployable images with metadata and environment requirements.',
    '/docs/sdk/pages': 'Build LongLink application pages with XML components, data bindings, and runtime metadata.',
    '/terms': 'Read the LongLink terms of service.',
    '/privacy': 'Read the LongLink privacy policy.',
    '/impressum': 'Read the LongLink legal notice and company information.',
};

const titlesByPath: Record<string, string> = {
    '/docs': 'Documentation | LongLink',
    '/docs/api': 'Platform Documentation | LongLink',
    '/docs/sdk': 'Applications Documentation | LongLink',
    '/terms': 'Terms of Service | LongLink',
    '/privacy': 'Privacy | LongLink',
    '/impressum': 'Impressum | LongLink',
};

/** Returns the canonical document path served by FastAPI. */
export function publicRoutePath(routePath: string): string {
    return routePath === '/' ? '/' : `${routePath}/`;
}

/** Builds one public SEO page from an article route catalog entry. */
export function articleSeoPage(page: { path: string; title: string }): PublicSeoPage {
    const fallbackTitle = page.path.startsWith('/docs') ? `${page.title} | LongLink Docs` : `${page.title} | LongLink`;

    return {
        path: page.path,
        title: titlesByPath[page.path] ?? fallbackTitle,
        description: descriptionsByPath[page.path] ?? `Read ${page.title} on LongLink.`,
    };
}

export const homeSeoPage: PublicSeoPage = {
    path: '/',
    title: 'LongLink | Python Platform for Business Applications',
    description:
        'LongLink is an open-source platform for building and running custom business-process applications with Python.',
};

export const pricingSeoPage: PublicSeoPage = {
    path: '/pricing',
    title: 'Pricing | LongLink',
    description: 'Simple LongLink pricing for building and running business-process applications.',
};

/** Builds React Router metadata for one prerendered public page. */
export function publicSeoMeta(page: PublicSeoPage): MetaDescriptor[] {
    const routePath = publicRoutePath(page.path);
    const canonicalUrl = `${SITE_URL}${routePath}`;
    const structuredData =
        page.path === '/'
            ? {
                  '@context': 'https://schema.org',
                  '@type': 'WebSite',
                  name: 'LongLink',
                  url: canonicalUrl,
                  hasPart: [
                      { '@type': 'SiteNavigationElement', name: 'Pricing', url: `${SITE_URL}/pricing/` },
                      { '@type': 'SiteNavigationElement', name: 'Documentation', url: `${SITE_URL}/docs/` },
                      {
                          '@type': 'SiteNavigationElement',
                          name: 'Applications / SDK Docs',
                          url: `${SITE_URL}/docs/sdk/`,
                      },
                      {
                          '@type': 'SiteNavigationElement',
                          name: 'Platform Docs',
                          url: `${SITE_URL}/docs/api/`,
                      },
                  ],
              }
            : {
                  '@context': 'https://schema.org',
                  '@type': page.path.startsWith('/docs') ? 'TechArticle' : 'WebPage',
                  name: page.title,
                  description: page.description,
                  url: canonicalUrl,
              };

    return [
        { title: page.title },
        { name: 'description', content: page.description },
        { name: 'robots', content: 'index, follow' },
        { tagName: 'link', rel: 'canonical', href: canonicalUrl },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: canonicalUrl },
        { property: 'og:title', content: page.title },
        { property: 'og:description', content: page.description },
        { 'script:ld+json': structuredData },
    ];
}
