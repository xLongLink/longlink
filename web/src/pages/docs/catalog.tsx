import { type ReactNode } from 'react';
import { Blocks, BookOpen, Database, FileCode2, FlaskConical, Globe, HardDrive, LayoutTemplate, Rocket, ServerCog, ShieldCheck, Waypoints } from 'lucide-react';

import { content as docsApiContent, metadata as docsApiMetadata } from '@/pages/docs/api/index';
import { content as docsSelfHostedContent, metadata as docsSelfHostedMetadata } from '@/pages/docs/api/self-hosted';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/pages/docs/index';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/pages/docs/sdk/building';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/pages/docs/sdk/database';
import { content as docsSdkEnvironmentsContent, metadata as docsSdkEnvironmentsMetadata } from '@/pages/docs/sdk/environments';
import { content as docsSdkContent, metadata as docsSdkMetadata } from '@/pages/docs/sdk/index';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/pages/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/pages/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/pages/docs/sdk/testing';
import { content as docsXmlComponentsContent, metadata as docsXmlComponentsMetadata } from '@/pages/docs/xml/components';
import { content as docsXmlContent, metadata as docsXmlMetadata } from '@/pages/docs/xml/index';
import { content as docsXmlLayoutContent, metadata as docsXmlLayoutMetadata } from '@/pages/docs/xml/layout';

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

type DocGroupTitle = 'Overview' | 'Control Plane' | 'Application SDK' | 'XML Pages';

type DocPage = {
    group: DocGroupTitle;
    title: string;
    path: string;
    id: string;
    icon: typeof BookOpen;
    content: ReactNode;
    metadata: DocMetadata;
};

export const DOC_PAGES: DocPage[] = [
    {
        group: 'Overview',
        title: 'Introduction',
        path: '/docs',
        id: 'introduction',
        icon: BookOpen,
        content: docsIndexContent,
        metadata: docsIndexMetadata,
    },
    {
        group: 'Control Plane',
        title: 'Overview',
        path: '/docs/api',
        id: 'control-plane-overview',
        icon: ShieldCheck,
        content: docsApiContent,
        metadata: docsApiMetadata,
    },
    {
        group: 'Control Plane',
        title: 'Self-hosted',
        path: '/docs/api/self-hosted',
        id: 'self-hosted',
        icon: ServerCog,
        content: docsSelfHostedContent,
        metadata: docsSelfHostedMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Overview',
        path: '/docs/sdk',
        id: 'sdk-overview',
        icon: Blocks,
        content: docsSdkContent,
        metadata: docsSdkMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Environments',
        path: '/docs/sdk/environments',
        id: 'environments',
        icon: Globe,
        content: docsSdkEnvironmentsContent,
        metadata: docsSdkEnvironmentsMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Routes',
        path: '/docs/sdk/routes',
        id: 'routes',
        icon: Waypoints,
        content: docsSdkRoutesContent,
        metadata: docsSdkRoutesMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Storage',
        path: '/docs/sdk/storage',
        id: 'storage',
        icon: HardDrive,
        content: docsSdkStorageContent,
        metadata: docsSdkStorageMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Database',
        path: '/docs/sdk/database',
        id: 'database',
        icon: Database,
        content: docsSdkDatabaseContent,
        metadata: docsSdkDatabaseMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Testing',
        path: '/docs/sdk/testing',
        id: 'testing',
        icon: FlaskConical,
        content: docsSdkTestingContent,
        metadata: docsSdkTestingMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Building',
        path: '/docs/sdk/building',
        id: 'building',
        icon: Rocket,
        content: docsSdkBuildingContent,
        metadata: docsSdkBuildingMetadata,
    },
    {
        group: 'XML Pages',
        title: 'Overview',
        path: '/docs/xml',
        id: 'xml-overview',
        icon: FileCode2,
        content: docsXmlContent,
        metadata: docsXmlMetadata,
    },
    {
        group: 'XML Pages',
        title: 'Layout',
        path: '/docs/xml/layout',
        id: 'layout',
        icon: LayoutTemplate,
        content: docsXmlLayoutContent,
        metadata: docsXmlLayoutMetadata,
    },
    {
        group: 'XML Pages',
        title: 'Components',
        path: '/docs/xml/components',
        id: 'components',
        icon: Blocks,
        content: docsXmlComponentsContent,
        metadata: docsXmlComponentsMetadata,
    },
];

const DOC_GROUP_ORDER: DocGroupTitle[] = ['Overview', 'Control Plane', 'Application SDK', 'XML Pages'];

export const DOC_GROUPS: Array<{ title: DocGroupTitle; items: DocItem[] }> = DOC_GROUP_ORDER.map((title) => ({
    title,
    items: DOC_PAGES.filter((page) => page.group === title).map(({ group: _group, content: _content, metadata: _metadata, ...item }) => item),
}));
