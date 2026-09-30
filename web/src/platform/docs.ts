import { componentDocumentation, documentationCategories } from '../lib/generated/documentation';
import {
    Cpu,
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

export const documentationSections: Array<{ title: string; pages: Array<DocumentationPage> }> = [
    {
        title: 'Introduction',
        pages: [{ path: '/docs/introduction', label: 'Why LongLink', icon: BookOpen }],
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
    {
        title: 'Self-hosted',
        pages: [
            { path: '/docs/self-hosted/release', label: 'Release', icon: Rocket },
            { path: '/docs/self-hosted/compute', label: 'Compute', icon: Cpu },
        ],
    },
];

// Keep static tutorials and generated component references in their published reading order.
const viewDocumentationPaths = [
    '/docs/sdk/views',
    ...documentationCategories.flatMap((category) =>
        componentDocumentation
            .filter((component) => component.category === category.name)
            .map(({ slug }) => `/docs/sdk/views/${slug}`)
    ),
];

export const documentationPaths = documentationSections.flatMap(({ pages }) =>
    pages.flatMap(({ path }) => (path === '/docs/sdk/views' ? viewDocumentationPaths : path))
);
