import type { ReactNode } from 'react';

import { content as docsApiIndexContent, metadata as docsApiIndexMetadata } from '@/pages/docs/api/index';
import {
    content as docsApiSelfHostedContent,
    metadata as docsApiSelfHostedMetadata,
} from '@/pages/docs/api/self-hosted';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/pages/docs/index';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/pages/docs/sdk/building';
import {
    content as docsSdkComponentsContent,
    metadata as docsSdkComponentsMetadata,
} from '@/pages/docs/sdk/components';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/pages/docs/sdk/database';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/pages/docs/sdk/environments';
import { content as docsSdkIndexContent, metadata as docsSdkIndexMetadata } from '@/pages/docs/sdk/index';
import { content as docsSdkLayoutContent, metadata as docsSdkLayoutMetadata } from '@/pages/docs/sdk/layout';
import { content as docsSdkPagesContent, metadata as docsSdkPagesMetadata } from '@/pages/docs/sdk/pages';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/pages/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/pages/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/pages/docs/sdk/testing';

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

type GroupedDocPage = DocPage & { group: DocGroupTitle };

const introductionPage: GroupedDocPage = {
    group: 'Overview',
    title: 'Introduction',
    path: '/docs',
    id: 'introduction',
    icon: BookOpen,
    content: docsIndexContent,
    metadata: docsIndexMetadata,
};

const controlPlaneOverviewPage: GroupedDocPage = {
    group: 'Control Plane',
    title: 'Overview',
    path: '/docs/api',
    id: 'control-plane-overview',
    icon: ShieldCheck,
    content: docsApiIndexContent,
    metadata: docsApiIndexMetadata,
};

const selfHostedPage: GroupedDocPage = {
    group: 'Control Plane',
    title: 'Self-hosted',
    path: '/docs/api/self-hosted',
    id: 'self-hosted',
    icon: ServerCog,
    content: docsApiSelfHostedContent,
    metadata: docsApiSelfHostedMetadata,
};

const sdkOverviewPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Overview',
    path: '/docs/sdk',
    id: 'sdk-overview',
    icon: Blocks,
    content: docsSdkIndexContent,
    metadata: docsSdkIndexMetadata,
};

const sdkEnvironmentsPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Environments',
    path: '/docs/sdk/environments',
    id: 'environments',
    icon: Globe,
    content: docsSdkEnvironmentsContent,
    metadata: docsSdkEnvironmentsMetadata,
};

const sdkRoutesPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Routes',
    path: '/docs/sdk/routes',
    id: 'routes',
    icon: Waypoints,
    content: docsSdkRoutesContent,
    metadata: docsSdkRoutesMetadata,
};

const sdkStoragePage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Storage',
    path: '/docs/sdk/storage',
    id: 'storage',
    icon: HardDrive,
    content: docsSdkStorageContent,
    metadata: docsSdkStorageMetadata,
};

const sdkDatabasePage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Database',
    path: '/docs/sdk/database',
    id: 'database',
    icon: Database,
    content: docsSdkDatabaseContent,
    metadata: docsSdkDatabaseMetadata,
};

const sdkTestingPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Testing',
    path: '/docs/sdk/testing',
    id: 'testing',
    icon: FlaskConical,
    content: docsSdkTestingContent,
    metadata: docsSdkTestingMetadata,
};

const sdkBuildingPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Building',
    path: '/docs/sdk/building',
    id: 'building',
    icon: Rocket,
    content: docsSdkBuildingContent,
    metadata: docsSdkBuildingMetadata,
};

const xmlLayoutPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Layout',
    path: '/docs/sdk/pages/layout',
    id: 'layout',
    icon: LayoutTemplate,
    content: docsSdkLayoutContent,
    metadata: docsSdkLayoutMetadata,
};

const xmlComponentsPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Components',
    path: '/docs/sdk/pages/components',
    id: 'components',
    icon: Blocks,
    content: docsSdkComponentsContent,
    metadata: docsSdkComponentsMetadata,
};

const sdkPagesPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Pages',
    path: '/docs/sdk/pages',
    id: 'pages',
    icon: FileCode2,
    content: docsSdkPagesContent,
    metadata: docsSdkPagesMetadata,
};

export const DOC_PAGES: GroupedDocPage[] = [
    introductionPage,
    controlPlaneOverviewPage,
    selfHostedPage,
    sdkOverviewPage,
    sdkEnvironmentsPage,
    sdkRoutesPage,
    sdkStoragePage,
    sdkDatabasePage,
    sdkTestingPage,
    sdkBuildingPage,
    xmlLayoutPage,
    xmlComponentsPage,
    sdkPagesPage,
];

/** Converts a full docs page into a sidebar navigation item. */
function navigationItem(page: DocPage, children?: DocNavigationItem[]): DocNavigationItem {
    return {
        title: page.title,
        path: page.path,
        id: page.id,
        icon: page.icon,
        children,
    };
}

export const DOC_GROUPS: Array<{ title: DocGroupTitle; items: DocNavigationItem[] }> = [
    {
        title: 'Overview',
        items: [navigationItem(introductionPage)],
    },
    {
        title: 'Control Plane',
        items: [navigationItem(controlPlaneOverviewPage), navigationItem(selfHostedPage)],
    },
    {
        title: 'Application SDK',
        items: [
            navigationItem(sdkOverviewPage),
            navigationItem(sdkEnvironmentsPage),
            navigationItem(sdkRoutesPage),
            navigationItem(sdkStoragePage),
            navigationItem(sdkDatabasePage),
            navigationItem(sdkTestingPage),
            navigationItem(sdkBuildingPage),
            navigationItem(sdkPagesPage, [navigationItem(xmlLayoutPage), navigationItem(xmlComponentsPage)]),
        ],
    },
];
