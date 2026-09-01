import { useLocation } from 'react-router';
import { documentationComponentSlugs } from '@/platform/docs';

const siteUrl = new URL(import.meta.env.VITE_SITE_URL ?? 'https://longlink.dev').origin;
const siteName = 'LongLink';
const componentSlugs = new Set<string>(documentationComponentSlugs);

type PageMetadata = {
    description: string;
    isIndexable: boolean;
    title: string;
};

const pages: Record<string, Omit<PageMetadata, 'isIndexable'>> = {
    '/': {
        title: 'LongLink | Build and operate business applications',
        description:
            'LongLink is the open-source foundation for building, deploying, and operating dedicated business applications in Python.',
    },
    '/pricing': {
        title: 'Pricing | LongLink',
        description: 'Explore LongLink plans for building and deploying dedicated business applications.',
    },
    '/docs': {
        title: 'Documentation | LongLink',
        description: 'Learn how to build, deploy, and operate applications with LongLink.',
    },
    '/docs/api': {
        title: 'Platform Documentation | LongLink',
        description: 'Learn how LongLink Platform manages organizations, applications, and shared infrastructure.',
    },
    '/docs/api/applications': {
        title: 'Applications | Platform Documentation | LongLink',
        description: 'Learn how to create, deploy, and operate applications on the LongLink Platform.',
    },
    '/docs/api/organizations': {
        title: 'Organizations | Platform Documentation | LongLink',
        description: 'Learn how organizations structure access and applications on the LongLink Platform.',
    },
    '/docs/sdk': {
        title: 'Application SDK Documentation | LongLink',
        description: 'Build LongLink applications as normal Python and FastAPI services with the Application SDK.',
    },
    '/docs/sdk/building': {
        title: 'Building Applications | LongLink Documentation',
        description: 'Build and package a LongLink application for deployment.',
    },
    '/docs/sdk/database': {
        title: 'Database | LongLink Documentation',
        description: 'Use database services in a LongLink application.',
    },
    '/docs/sdk/environments': {
        title: 'Environments | LongLink Documentation',
        description: 'Configure environments for local development and deployed LongLink applications.',
    },
    '/docs/sdk/routes': {
        title: 'Routes | LongLink Documentation',
        description: 'Define API routes in a LongLink application.',
    },
    '/docs/sdk/storage': {
        title: 'Storage | LongLink Documentation',
        description: 'Store and manage files in a LongLink application.',
    },
    '/docs/sdk/testing': {
        title: 'Testing | LongLink Documentation',
        description: 'Test LongLink applications and their XML pages.',
    },
    '/docs/sdk/pages': {
        title: 'Pages | LongLink Documentation',
        description: 'Build application interfaces with LongLink XML pages and components.',
    },
    '/docs/sdk/pages/bindings': {
        title: 'Bindings | LongLink Documentation',
        description: 'Bind LongLink XML page components to application data and state.',
    },
    '/docs/sdk/pages/expressions': {
        title: 'Expressions | LongLink Documentation',
        description: 'Use expressions in LongLink XML pages to render dynamic application interfaces.',
    },
    '/terms': {
        title: 'Terms of Service | LongLink',
        description: 'Read the LongLink terms of service.',
    },
    '/privacy': {
        title: 'Privacy Policy | LongLink',
        description: 'Read the LongLink privacy policy.',
    },
    '/impressum': {
        title: 'Impressum | LongLink',
        description: 'Read the LongLink legal notice and company information.',
    },
};

/** Returns the canonical path with the site-wide trailing-slash convention. */
function canonicalPath(pathname: string): string {
    if (pathname === '/') {
        return pathname;
    }

    return `${pathname.replace(/\/+$/, '')}/`;
}

/** Formats a URL path segment for a page title or structured-data breadcrumb. */
function pathLabel(segment: string): string {
    const labels: Record<string, string> = {
        api: 'Platform',
        docs: 'Documentation',
        sdk: 'Applications',
    };

    return labels[segment] ?? segment.replaceAll('-', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

/** Returns metadata for public content and prevents workflow routes from entering search results. */
function pageMetadata(pathname: string): PageMetadata {
    const page = pages[pathname];
    if (page) {
        return { ...page, isIndexable: true };
    }

    const component = pathname.match(/^\/docs\/sdk\/pages\/([a-z-]+)$/)?.[1];
    if (component && componentSlugs.has(component)) {
        const name = pathLabel(component);

        return {
            title: `${name} XML Component | LongLink Documentation`,
            description: `Reference documentation for the ${name} XML component in LongLink application pages.`,
            isIndexable: true,
        };
    }

    return {
        title: `Page not found | ${siteName}`,
        description: 'This LongLink page is not available.',
        isIndexable: false,
    };
}

/** Builds breadcrumb structured data for indexed documentation and legal articles. */
function breadcrumbs(pathname: string) {
    if (!pathname.startsWith('/docs') && !['/terms', '/privacy', '/impressum'].includes(pathname)) {
        return undefined;
    }

    const segments = pathname.split('/').filter(Boolean);
    const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` }];

    for (const [index, segment] of segments.entries()) {
        const path = `/${segments.slice(0, index + 1).join('/')}`;
        items.push({
            '@type': 'ListItem',
            position: index + 2,
            name: pathLabel(segment),
            item: `${siteUrl}${canonicalPath(path)}`,
        });
    }

    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
}

/** Renders route-aware metadata into the document head. */
export function SearchMetadata() {
    const { pathname } = useLocation();
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    const metadata = pageMetadata(path);
    const canonicalUrl = `${siteUrl}${canonicalPath(path)}`;
    const breadcrumbData = metadata.isIndexable ? breadcrumbs(path) : undefined;
    const structuredData =
        path === '/'
            ? {
                  '@context': 'https://schema.org',
                  '@graph': [
                      {
                          '@type': 'Organization',
                          name: siteName,
                          url: siteUrl,
                          sameAs: [
                              'https://github.com/xLongLink/longlink',
                              'https://www.linkedin.com/company/longlink',
                          ],
                      },
                      {
                          '@type': 'WebSite',
                          name: siteName,
                          url: siteUrl,
                          description: metadata.description,
                      },
                  ],
              }
            : breadcrumbData;

    return (
        <>
            <title>{metadata.title}</title>
            <meta name="description" content={metadata.description} />
            <meta name="robots" content={metadata.isIndexable ? 'index, follow' : 'noindex, nofollow'} />
            <link rel="canonical" href={canonicalUrl} />
            <meta property="og:type" content="website" />
            <meta property="og:site_name" content={siteName} />
            <meta property="og:title" content={metadata.title} />
            <meta property="og:description" content={metadata.description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta name="twitter:card" content="summary" />
            <meta name="twitter:title" content={metadata.title} />
            <meta name="twitter:description" content={metadata.description} />
            {structuredData ? (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll('<', '\\u003c') }}
                />
            ) : null}
        </>
    );
}
