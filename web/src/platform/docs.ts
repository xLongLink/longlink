import { componentDocumentationSlugs } from '../lib/generated/documentation';

export type DocumentationIcon =
    | 'appWindow'
    | 'bookOpen'
    | 'building'
    | 'database'
    | 'fileCode'
    | 'flask'
    | 'globe'
    | 'hardDrive'
    | 'package'
    | 'rocket'
    | 'shield'
    | 'waypoints';

type DocumentationPage = {
    path: string;
    label: string;
    icon: DocumentationIcon;
    componentPagesAfter?: boolean;
};

export const documentationSections: Array<{ title: string; pages: Array<DocumentationPage> }> = [
    {
        title: 'Overview',
        pages: [{ path: '/docs', label: 'Introduction', icon: 'bookOpen' }],
    },
    {
        title: 'Platform',
        pages: [
            { path: '/docs/api', label: 'Overview', icon: 'shield' },
            { path: '/docs/api/organizations', label: 'Organizations', icon: 'building' },
            { path: '/docs/api/solutions', label: 'Solutions', icon: 'appWindow' },
        ],
    },
    {
        title: 'Solutions',
        pages: [
            { path: '/docs/sdk', label: 'Overview', icon: 'package' },
            { path: '/docs/sdk/environments', label: 'Environments', icon: 'globe' },
            { path: '/docs/sdk/routes', label: 'Routes', icon: 'waypoints' },
            { path: '/docs/sdk/storage', label: 'Storage', icon: 'hardDrive' },
            { path: '/docs/sdk/database', label: 'Database', icon: 'database' },
            { path: '/docs/sdk/views', label: 'Views', icon: 'fileCode', componentPagesAfter: true },
            { path: '/docs/sdk/testing', label: 'Testing', icon: 'flask' },
            { path: '/docs/sdk/building', label: 'Building', icon: 'rocket' },
        ],
    },
];

const viewDocumentationSlugs = componentDocumentationSlugs.flatMap((slug) => {
    if (slug === 'button') {
        return ['bindings', slug];
    }
    if (slug === 'file-input') {
        return ['expressions', slug];
    }
    return slug;
});

export const documentationPaths = documentationSections.flatMap(({ pages }) =>
    pages.flatMap(({ path, componentPagesAfter }) => [
        path,
        ...(componentPagesAfter ? viewDocumentationSlugs.map((slug) => `/docs/sdk/views/${slug}`) : []),
    ])
);
