import { documentationCategories } from '../lib/documentation';
import componentCatalog from '../../../sdk/longlink/.static/jsx/components.json';
import {
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    BookOpen,
    HardDrive,
    Package,
    Rocket,
    ShieldCheck,
    Waypoints,
    type LucideIcon,
} from 'lucide-react';

type DocumentationPage = {
    path: string;
    label: string;
    icon: LucideIcon;
};

// Keep companion components available without adding standalone navigation entries.
export { componentCatalog };

// Derive website route identity from names without storing it in the SDK documentation catalog.
export const componentDocumentation = componentCatalog
    .filter((component) => !['ButtonGroup', 'StatusDot', 'CodeBlock', 'DateRangeInput'].includes(component.name))
    .map((component) => ({
        ...component,
        declaration:
            component.name === 'Button'
                ? componentCatalog
                      .filter((candidate) => candidate.name === 'Button' || candidate.name === 'ButtonGroup')
                      .map((candidate) => candidate.declaration)
                      .join('\n\n')
                : component.declaration,
        label: component.name === 'Button' ? 'Buttons' : component.name,
        slug:
            component.name === 'Button'
                ? 'buttons'
                : component.name
                      .replace(/([a-z])([A-Z])/g, '$1-$2')
                      .replace(/\s+/g, '-')
                      .toLowerCase(),
    }));

export const documentationSections: Array<{ title: string; pages: Array<DocumentationPage> }> = [
    {
        title: 'Introduction',
        pages: [{ path: '/docs', label: 'Documentation', icon: BookOpen }],
    },
    {
        title: 'Solutions',
        pages: [
            { path: '/docs/sdk', label: 'Overview', icon: Package },
            { path: '/docs/sdk/environments', label: 'Environments', icon: Globe },
            { path: '/docs/sdk/routes', label: 'Routes', icon: Waypoints },
            { path: '/docs/sdk/storage', label: 'Storage', icon: HardDrive },
            { path: '/docs/sdk/database', label: 'Database', icon: Database },
            { path: '/docs/sdk/views', label: 'Views', icon: FileCode2 },
            { path: '/docs/sdk/testing', label: 'Testing', icon: FlaskConical },
            { path: '/docs/sdk/building', label: 'Building', icon: Rocket },
        ],
    },
    {
        title: 'Platform',
        pages: [{ path: '/docs/api', label: 'Overview', icon: ShieldCheck }],
    },
];

// Keep static tutorials and generated component references in their published reading order.
const viewDocumentationPaths = [
    '/docs/sdk/views',
    ...documentationCategories.flatMap((category) =>
        componentDocumentation
            .filter((component) => component.category === category)
            .map(({ slug }) => `/docs/sdk/views/${slug}`)
    ),
];

export const documentationPaths = documentationSections.flatMap(({ pages }) =>
    pages.flatMap(({ path }) => (path === '/docs/sdk/views' ? viewDocumentationPaths : path))
);
