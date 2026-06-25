import type { ReactNode } from 'react';

import { Blocks, BookOpen, Database, FileCode2, FlaskConical, Globe, HardDrive, LayoutTemplate, Rocket, ServerCog, ShieldCheck, Waypoints } from 'lucide-react';

type DocMetadata = {
    lastUpdated?: string;
    editUrl?: string;
};

export type DocItem = {
    title: string;
    path: string;
    id: string;
    icon: typeof BookOpen;
};

export type DocPage = DocItem & {
    loadContent: () => Promise<{
        content: ReactNode;
        metadata: DocMetadata;
    }>;
};

type DocGroupTitle = 'Overview' | 'Control Plane' | 'Application SDK' | 'XML Pages';

export const DOC_PAGES: Array<DocPage & { group: DocGroupTitle }> = [
    {
        group: 'Overview',
        title: 'Introduction',
        path: '/docs',
        id: 'introduction',
        icon: BookOpen,
        loadContent: async () => {
            const module = await import('@/pages/docs/index');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Control Plane',
        title: 'Overview',
        path: '/docs/api',
        id: 'control-plane-overview',
        icon: ShieldCheck,
        loadContent: async () => {
            const module = await import('@/pages/docs/api/index');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Control Plane',
        title: 'Self-hosted',
        path: '/docs/api/self-hosted',
        id: 'self-hosted',
        icon: ServerCog,
        loadContent: async () => {
            const module = await import('@/pages/docs/api/self-hosted');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Overview',
        path: '/docs/sdk',
        id: 'sdk-overview',
        icon: Blocks,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/index');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Environments',
        path: '/docs/sdk/environments',
        id: 'environments',
        icon: Globe,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/environments');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Routes',
        path: '/docs/sdk/routes',
        id: 'routes',
        icon: Waypoints,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/routes');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Storage',
        path: '/docs/sdk/storage',
        id: 'storage',
        icon: HardDrive,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/storage');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Database',
        path: '/docs/sdk/database',
        id: 'database',
        icon: Database,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/database');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Testing',
        path: '/docs/sdk/testing',
        id: 'testing',
        icon: FlaskConical,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/testing');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'Application SDK',
        title: 'Building',
        path: '/docs/sdk/building',
        id: 'building',
        icon: Rocket,
        loadContent: async () => {
            const module = await import('@/pages/docs/sdk/building');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'XML Pages',
        title: 'Overview',
        path: '/docs/xml',
        id: 'xml-overview',
        icon: FileCode2,
        loadContent: async () => {
            const module = await import('@/pages/docs/xml/index');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'XML Pages',
        title: 'Layout',
        path: '/docs/xml/layout',
        id: 'layout',
        icon: LayoutTemplate,
        loadContent: async () => {
            const module = await import('@/pages/docs/xml/layout');

            return { content: module.content, metadata: module.metadata };
        },
    },
    {
        group: 'XML Pages',
        title: 'Components',
        path: '/docs/xml/components',
        id: 'components',
        icon: Blocks,
        loadContent: async () => {
            const module = await import('@/pages/docs/xml/components');

            return { content: module.content, metadata: module.metadata };
        },
    },
];

const DOC_GROUP_ORDER: DocGroupTitle[] = ['Overview', 'Control Plane', 'Application SDK', 'XML Pages'];

export const DOC_GROUPS: Array<{ title: DocGroupTitle; items: DocItem[] }> = DOC_GROUP_ORDER.map((title) => ({
    title,
    items: DOC_PAGES.filter((page) => page.group === title).map(({ group: _group, loadContent: _loadContent, ...item }) => item),
}));
