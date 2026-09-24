import { componentDocumentation } from '../lib/generated/documentation';

export type DocumentationIcon =
    | 'appWindow'
    | 'bookOpen'
    | 'building'
    | 'cpu'
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
            { path: '/docs/sdk/views', label: 'Views', icon: 'fileCode' },
            { path: '/docs/sdk/testing', label: 'Testing', icon: 'flask' },
            { path: '/docs/sdk/building', label: 'Building', icon: 'rocket' },
        ],
    },
    {
        title: 'Self-hosted',
        pages: [
            { path: '/docs/self-hosted/release', label: 'Release', icon: 'rocket' },
            { path: '/docs/self-hosted/compute', label: 'Compute', icon: 'cpu' },
        ],
    },
];

// Keep static tutorials and generated component references in their published reading order.
const viewDocumentationPaths = [
    '/docs/sdk/views',
    '/docs/sdk/views/bindings',
    '/docs/sdk/views/expressions',
    ...componentDocumentation.map(({ slug }) => `/docs/sdk/views/${slug}`),
].sort();

export const documentationPaths = documentationSections.flatMap(({ pages }) =>
    pages.flatMap(({ path }) => (path === '/docs/sdk/views' ? viewDocumentationPaths : path))
);
