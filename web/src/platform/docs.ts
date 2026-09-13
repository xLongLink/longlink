import { componentDocumentationSlugs } from '../lib/generated/documentation';

const viewDocumentationSlugs = componentDocumentationSlugs.flatMap((slug) => {
    if (slug === 'button') {
        return ['bindings', slug];
    }
    if (slug === 'file-input') {
        return ['expressions', slug];
    }
    return slug;
});

export const documentationPaths = [
    '/docs',
    '/docs/api',
    '/docs/api/organizations',
    '/docs/api/solutions',
    '/docs/sdk',
    '/docs/sdk/environments',
    '/docs/sdk/routes',
    '/docs/sdk/storage',
    '/docs/sdk/database',
    '/docs/sdk/views',
    ...viewDocumentationSlugs.map((slug) => `/docs/sdk/views/${slug}`),
    '/docs/sdk/testing',
    '/docs/sdk/building',
];
