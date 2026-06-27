import type { ReactNode } from 'react';

import { content as docsApiIndexContent, metadata as docsApiIndexMetadata } from '@/pages/docs/api/index';
import {
    content as docsApiSelfHostedContent,
    metadata as docsApiSelfHostedMetadata,
} from '@/pages/docs/api/self-hosted';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/pages/docs/index';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/pages/docs/sdk/building';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/pages/docs/sdk/database';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/pages/docs/sdk/environments';
import { content as docsSdkIndexContent, metadata as docsSdkIndexMetadata } from '@/pages/docs/sdk/index';
import { content as docsSdkPagesContent, metadata as docsSdkPagesMetadata } from '@/pages/docs/sdk/pages';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/pages/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/pages/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/pages/docs/sdk/testing';
import {
    content as docsXmlComponentsContent,
    metadata as docsXmlComponentsMetadata,
} from '@/pages/docs/xml/components';
import { content as docsXmlLayoutContent, metadata as docsXmlLayoutMetadata } from '@/pages/docs/xml/layout';

import {
    Blocks,
    BookOpen,
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    HardDrive,
    LayoutTemplate,
    Rocket,
    ServerCog,
    ShieldCheck,
    Waypoints,
} from 'lucide-react';

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
    content: ReactNode;
    metadata: DocMetadata;
};

export type DocNavigationItem = Omit<DocItem, 'icon'> & {
    icon?: typeof BookOpen;
    children?: DocNavigationItem[];
};

type DocGroupTitle = 'Overview' | 'Control Plane' | 'Application SDK';

export const DOC_PAGES: Array<DocPage & { group: DocGroupTitle }> = [
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
        content: docsApiIndexContent,
        metadata: docsApiIndexMetadata,
    },
    {
        group: 'Control Plane',
        title: 'Self-hosted',
        path: '/docs/api/self-hosted',
        id: 'self-hosted',
        icon: ServerCog,
        content: docsApiSelfHostedContent,
        metadata: docsApiSelfHostedMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Overview',
        path: '/docs/sdk',
        id: 'sdk-overview',
        icon: Blocks,
        content: docsSdkIndexContent,
        metadata: docsSdkIndexMetadata,
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
        group: 'Application SDK',
        title: 'Layout',
        path: '/docs/sdk/pages/layout',
        id: 'layout',
        icon: LayoutTemplate,
        content: docsXmlLayoutContent,
        metadata: docsXmlLayoutMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Components',
        path: '/docs/sdk/pages/components',
        id: 'components',
        icon: Blocks,
        content: docsXmlComponentsContent,
        metadata: docsXmlComponentsMetadata,
    },
    {
        group: 'Application SDK',
        title: 'Pages',
        path: '/docs/sdk/pages',
        id: 'pages',
        icon: FileCode2,
        content: docsSdkPagesContent,
        metadata: docsSdkPagesMetadata,
    },
];

const DOC_GROUP_ORDER: DocGroupTitle[] = ['Overview', 'Control Plane', 'Application SDK'];

/** Builds the nested docs navigation for the sidebar. */
export const DOC_GROUPS: Array<{ title: DocGroupTitle; items: DocNavigationItem[] }> = DOC_GROUP_ORDER.map((title) => {
    const groupPages = DOC_PAGES.filter((page) => page.group === title).map(({ group: _group, ...item }) => item);

    if (title !== 'Application SDK') {
        return { title, items: groupPages };
    }

    return {
        title,
        items: [
            groupPages[0],
            groupPages[1],
            groupPages[2],
            groupPages[3],
            groupPages[4],
            groupPages[5],
            groupPages[6],
            {
                ...groupPages[9],
                children: [
                    groupPages[7],
                    groupPages[8],
                ],
            },
        ],
    };
});
