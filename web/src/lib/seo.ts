import { DOC_PAGES } from '@/pages/docs/catalog';
import { LEGAL_PAGES } from '@/pages/legal/catalog';

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
    '/docs/sdk/pages/expressions':
        'Use expressions in LongLink XML pages for bindings, conditionals, loops, and actions.',
    '/docs/sdk/pages/layout':
        'Compose LongLink XML pages with layout components for readable business application screens.',
    '/docs/sdk/pages/components':
        'Use LongLink XML components for forms, tables, actions, navigation, and application interfaces.',
    '/terms': 'Read the LongLink terms of service.',
    '/privacy': 'Read the LongLink privacy policy.',
    '/impressum': 'Read the LongLink legal notice and company information.',
};

const titlesByPath: Record<string, string> = {
    '/docs': 'Documentation | LongLink',
    '/docs/api': 'Platform Documentation | LongLink',
    '/docs/sdk': 'Applications / SDK Documentation | LongLink',
    '/terms': 'Terms of Service | LongLink',
    '/privacy': 'Privacy | LongLink',
    '/impressum': 'Impressum | LongLink',
};

/** Builds one public SEO page from an article route catalog entry. */
function articleSeoPage(page: { path: string; title: string }): PublicSeoPage {
    const fallbackTitle = page.path.startsWith('/docs') ? `${page.title} | LongLink Docs` : `${page.title} | LongLink`;

    return {
        path: page.path,
        title: titlesByPath[page.path] ?? fallbackTitle,
        description: descriptionsByPath[page.path] ?? `Read ${page.title} on LongLink.`,
    };
}

export const publicSeoPages: PublicSeoPage[] = [
    {
        path: '/',
        title: 'LongLink | Python Platform for Business Applications',
        description:
            'LongLink is an open-source platform for building and running custom business-process applications with Python.',
    },
    {
        path: '/pricing',
        title: 'Pricing | LongLink',
        description: 'Simple LongLink pricing for building and running business-process applications.',
    },
    ...DOC_PAGES.map(articleSeoPage),
    ...LEGAL_PAGES.map(articleSeoPage),
];
