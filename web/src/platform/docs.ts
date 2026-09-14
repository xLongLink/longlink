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
];

// Keep static tutorials and generated component references in their published reading order.
const viewDocumentationPaths = [
    '/docs/sdk/views',
    '/docs/sdk/views/action',
    '/docs/sdk/views/avatar',
    '/docs/sdk/views/badge',
    '/docs/sdk/views/button',
    '/docs/sdk/views/bindings',
    '/docs/sdk/views/card',
    '/docs/sdk/views/checkbox-input',
    '/docs/sdk/views/dialog',
    '/docs/sdk/views/divider',
    '/docs/sdk/views/file-input',
    '/docs/sdk/views/expressions',
    '/docs/sdk/views/for',
    '/docs/sdk/views/grid',
    '/docs/sdk/views/heading',
    '/docs/sdk/views/icon',
    '/docs/sdk/views/link',
    '/docs/sdk/views/menu',
    '/docs/sdk/views/more-menu',
    '/docs/sdk/views/number-input',
    '/docs/sdk/views/progress-bar',
    '/docs/sdk/views/query',
    '/docs/sdk/views/radio-list',
    '/docs/sdk/views/selector',
    '/docs/sdk/views/slider',
    '/docs/sdk/views/stack',
    '/docs/sdk/views/state',
    '/docs/sdk/views/switch',
    '/docs/sdk/views/tabs',
    '/docs/sdk/views/table',
    '/docs/sdk/views/text',
    '/docs/sdk/views/text-area',
    '/docs/sdk/views/text-input',
];

export const documentationPaths = documentationSections.flatMap(({ pages }) =>
    pages.flatMap(({ path }) => (path === '/docs/sdk/views' ? viewDocumentationPaths : path))
);
