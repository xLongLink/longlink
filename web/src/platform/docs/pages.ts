import type { PublicPage } from '../public';
import { pageReferenceDocs, type ElementDoc } from './sdk/references';

export const documentationPages = {
    introduction: {
        path: '/docs',
        title: 'Introduction',
        seoTitle: 'Documentation | LongLink',
        description: 'Learn how LongLink helps teams build and run structured business applications.',
    },
    platform: {
        path: '/docs/api',
        title: 'Overview',
        seoTitle: 'Platform Documentation | LongLink',
        description:
            'Understand the LongLink Platform for organizations, applications, infrastructure, and operations.',
    },
    organizations: {
        path: '/docs/api/organizations',
        title: 'Organizations',
        description: 'Learn how LongLink organizations, memberships, and access boundaries work.',
    },
    applications: {
        path: '/docs/api/applications',
        title: 'Applications',
        description: 'Learn how LongLink registers, deploys, routes, and manages business applications.',
    },
    sdk: {
        path: '/docs/sdk',
        title: 'Overview',
        seoTitle: 'Applications Documentation | LongLink',
        description:
            'Build LongLink applications locally with the Python SDK, XML pages, routes, storage, and database tools.',
    },
    environments: {
        path: '/docs/sdk/environments',
        title: 'Environments',
        description: 'Configure LongLink applications for local development, testing, and production environments.',
    },
    routes: {
        path: '/docs/sdk/routes',
        title: 'Routes',
        description: 'Add FastAPI routes to LongLink applications for APIs, actions, and process-specific behavior.',
    },
    storage: {
        path: '/docs/sdk/storage',
        title: 'Storage',
        description:
            'Use LongLink storage abstractions across local filesystems, tests, and production object storage.',
    },
    database: {
        path: '/docs/sdk/database',
        title: 'Database',
        description: 'Use LongLink database helpers and migrations for application-owned data models.',
    },
    pages: {
        path: '/docs/sdk/pages',
        title: 'Pages',
        description: 'Build LongLink application pages with XML components, data bindings, and runtime metadata.',
    },
    testing: {
        path: '/docs/sdk/testing',
        title: 'Testing',
        description: 'Test LongLink applications with isolated runtime configuration and Python testing workflows.',
    },
    building: {
        path: '/docs/sdk/building',
        title: 'Building',
        description: 'Package LongLink applications into deployable images with metadata and environment requirements.',
    },
} satisfies Record<string, PublicPage>;

/** Builds public page metadata for one XML reference definition. */
export function pageElementPage(page: ElementDoc): PublicPage {
    return {
        path: `/docs/sdk/pages/${page.slug}`,
        title: page.name,
        description: page.summary,
    };
}

export const documentationPublicPages: PublicPage[] = [
    ...Object.values(documentationPages),
    ...pageReferenceDocs.map(pageElementPage),
];
