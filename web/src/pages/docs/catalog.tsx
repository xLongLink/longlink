import {
    content as docsApiApplicationsContent,
    metadata as docsApiApplicationsMetadata,
} from '@/pages/docs/api/applications';
import { content as docsApiIndexContent, metadata as docsApiIndexMetadata } from '@/pages/docs/api/index';
import {
    content as docsApiOrganizationsContent,
    metadata as docsApiOrganizationsMetadata,
} from '@/pages/docs/api/organizations';
import {
    content as docsApiSelfHostedContent,
    metadata as docsApiSelfHostedMetadata,
} from '@/pages/docs/api/self-hosted';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/pages/docs/index';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/pages/docs/sdk/building';
import { content as docsSdkCliContent, metadata as docsSdkCliMetadata } from '@/pages/docs/sdk/cli';
import {
    content as docsSdkComponentsContent,
    metadata as docsSdkComponentsMetadata,
} from '@/pages/docs/sdk/components';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/pages/docs/sdk/database';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/pages/docs/sdk/environments';
import {
    content as docsSdkExpressionsContent,
    metadata as docsSdkExpressionsMetadata,
} from '@/pages/docs/sdk/expressions';
import { content as docsSdkIndexContent, metadata as docsSdkIndexMetadata } from '@/pages/docs/sdk/index';
import { content as docsSdkLayoutContent, metadata as docsSdkLayoutMetadata } from '@/pages/docs/sdk/layout';
import { content as docsSdkPagesContent, metadata as docsSdkPagesMetadata } from '@/pages/docs/sdk/pages';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/pages/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/pages/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/pages/docs/sdk/testing';

import type { ArticleBreadcrumb, ArticleNavigationItem, ArticlePage } from '@/pages/catalog';
import {
    Blocks,
    BookOpen,
    Boxes,
    Building2,
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

type DocGroupTitle = 'Overview' | 'Control Plane' | 'Application SDK';

type GroupedDocPage = ArticlePage & { group: DocGroupTitle };

const documentationBreadcrumb: ArticleBreadcrumb = { title: 'Documentation', path: '/docs' };
const controlPlaneBreadcrumb: ArticleBreadcrumb = { title: 'Control Plane', path: '/docs/api' };
const applicationSdkBreadcrumb: ArticleBreadcrumb = { title: 'Application SDK', path: '/docs/sdk' };

const introductionPage: GroupedDocPage = {
    group: 'Overview',
    title: 'Introduction',
    path: '/docs',
    id: 'introduction',
    icon: BookOpen,
    breadcrumbs: [documentationBreadcrumb],
    content: docsIndexContent,
    metadata: docsIndexMetadata,
};

const controlPlaneOverviewPage: GroupedDocPage = {
    group: 'Control Plane',
    title: 'Overview',
    path: '/docs/api',
    id: 'control-plane-overview',
    icon: ShieldCheck,
    breadcrumbs: [documentationBreadcrumb, controlPlaneBreadcrumb],
    content: docsApiIndexContent,
    metadata: docsApiIndexMetadata,
};

const selfHostedPage: GroupedDocPage = {
    group: 'Control Plane',
    title: 'Self-hosted',
    path: '/docs/api/self-hosted',
    id: 'self-hosted',
    icon: ServerCog,
    breadcrumbs: [
        documentationBreadcrumb,
        controlPlaneBreadcrumb,
        { title: 'Self-hosted', path: '/docs/api/self-hosted' },
    ],
    content: docsApiSelfHostedContent,
    metadata: docsApiSelfHostedMetadata,
};

const organizationsPage: GroupedDocPage = {
    group: 'Control Plane',
    title: 'Organizations',
    path: '/docs/api/organizations',
    id: 'organizations',
    icon: Building2,
    breadcrumbs: [
        documentationBreadcrumb,
        controlPlaneBreadcrumb,
        { title: 'Organizations', path: '/docs/api/organizations' },
    ],
    content: docsApiOrganizationsContent,
    metadata: docsApiOrganizationsMetadata,
};

const applicationsPage: GroupedDocPage = {
    group: 'Control Plane',
    title: 'Applications',
    path: '/docs/api/applications',
    id: 'applications',
    icon: Boxes,
    breadcrumbs: [
        documentationBreadcrumb,
        controlPlaneBreadcrumb,
        { title: 'Applications', path: '/docs/api/applications' },
    ],
    content: docsApiApplicationsContent,
    metadata: docsApiApplicationsMetadata,
};

const sdkOverviewPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Overview',
    path: '/docs/sdk',
    id: 'sdk-overview',
    icon: Blocks,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb],
    content: docsSdkIndexContent,
    metadata: docsSdkIndexMetadata,
};

const sdkCliPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'CLI Reference',
    path: '/docs/sdk/cli',
    id: 'cli-reference',
    icon: FileCode2,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'CLI Reference', path: '/docs/sdk/cli' }],
    content: docsSdkCliContent,
    metadata: docsSdkCliMetadata,
};

const sdkEnvironmentsPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Environments',
    path: '/docs/sdk/environments',
    id: 'environments',
    icon: Globe,
    breadcrumbs: [
        documentationBreadcrumb,
        applicationSdkBreadcrumb,
        { title: 'Environments', path: '/docs/sdk/environments' },
    ],
    content: docsSdkEnvironmentsContent,
    metadata: docsSdkEnvironmentsMetadata,
};

const sdkRoutesPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Routes',
    path: '/docs/sdk/routes',
    id: 'routes',
    icon: Waypoints,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'Routes', path: '/docs/sdk/routes' }],
    content: docsSdkRoutesContent,
    metadata: docsSdkRoutesMetadata,
};

const sdkStoragePage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Storage',
    path: '/docs/sdk/storage',
    id: 'storage',
    icon: HardDrive,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'Storage', path: '/docs/sdk/storage' }],
    content: docsSdkStorageContent,
    metadata: docsSdkStorageMetadata,
};

const sdkDatabasePage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Database',
    path: '/docs/sdk/database',
    id: 'database',
    icon: Database,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'Database', path: '/docs/sdk/database' }],
    content: docsSdkDatabaseContent,
    metadata: docsSdkDatabaseMetadata,
};

const sdkTestingPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Testing',
    path: '/docs/sdk/testing',
    id: 'testing',
    icon: FlaskConical,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'Testing', path: '/docs/sdk/testing' }],
    content: docsSdkTestingContent,
    metadata: docsSdkTestingMetadata,
};

const sdkBuildingPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Building',
    path: '/docs/sdk/building',
    id: 'building',
    icon: Rocket,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'Building', path: '/docs/sdk/building' }],
    content: docsSdkBuildingContent,
    metadata: docsSdkBuildingMetadata,
};

const xmlLayoutPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Layout',
    path: '/docs/sdk/pages/layout',
    id: 'layout',
    icon: LayoutTemplate,
    breadcrumbs: [
        documentationBreadcrumb,
        applicationSdkBreadcrumb,
        { title: 'Layout', path: '/docs/sdk/pages/layout' },
    ],
    content: docsSdkLayoutContent,
    metadata: docsSdkLayoutMetadata,
};

const xmlComponentsPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Components',
    path: '/docs/sdk/pages/components',
    id: 'components',
    icon: Blocks,
    breadcrumbs: [
        documentationBreadcrumb,
        applicationSdkBreadcrumb,
        { title: 'Components', path: '/docs/sdk/pages/components' },
    ],
    content: docsSdkComponentsContent,
    metadata: docsSdkComponentsMetadata,
};

const xmlExpressionsPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Expressions',
    path: '/docs/sdk/pages/expressions',
    id: 'expressions',
    icon: FileCode2,
    breadcrumbs: [
        documentationBreadcrumb,
        applicationSdkBreadcrumb,
        { title: 'Expressions', path: '/docs/sdk/pages/expressions' },
    ],
    content: docsSdkExpressionsContent,
    metadata: docsSdkExpressionsMetadata,
};

const sdkPagesPage: GroupedDocPage = {
    group: 'Application SDK',
    title: 'Pages',
    path: '/docs/sdk/pages',
    id: 'pages',
    icon: FileCode2,
    breadcrumbs: [documentationBreadcrumb, applicationSdkBreadcrumb, { title: 'Pages', path: '/docs/sdk/pages' }],
    content: docsSdkPagesContent,
    metadata: docsSdkPagesMetadata,
};

export const DOC_PAGES: GroupedDocPage[] = [
    introductionPage,
    controlPlaneOverviewPage,
    organizationsPage,
    applicationsPage,
    selfHostedPage,
    sdkOverviewPage,
    sdkCliPage,
    sdkEnvironmentsPage,
    sdkRoutesPage,
    sdkStoragePage,
    sdkDatabasePage,
    sdkTestingPage,
    sdkBuildingPage,
    xmlExpressionsPage,
    xmlLayoutPage,
    xmlComponentsPage,
    sdkPagesPage,
];

/** Converts a full docs page into a sidebar navigation item. */
function navigationItem(page: ArticlePage, children?: ArticleNavigationItem[]): ArticleNavigationItem {
    return {
        title: page.title,
        path: page.path,
        id: page.id,
        icon: page.icon,
        children,
    };
}

export const DOC_GROUPS: Array<{ title: DocGroupTitle; items: ArticleNavigationItem[] }> = [
    {
        title: 'Overview',
        items: [navigationItem(introductionPage)],
    },
    {
        title: 'Control Plane',
        items: [
            navigationItem(controlPlaneOverviewPage),
            navigationItem(organizationsPage),
            navigationItem(applicationsPage),
            navigationItem(selfHostedPage),
        ],
    },
    {
        title: 'Application SDK',
        items: [
            navigationItem(sdkOverviewPage),
            navigationItem(sdkCliPage),
            navigationItem(sdkEnvironmentsPage),
            navigationItem(sdkRoutesPage),
            navigationItem(sdkStoragePage),
            navigationItem(sdkDatabasePage),
            navigationItem(sdkTestingPage),
            navigationItem(sdkBuildingPage),
            navigationItem(sdkPagesPage, [
                navigationItem(xmlExpressionsPage),
                navigationItem(xmlLayoutPage),
                navigationItem(xmlComponentsPage),
            ]),
        ],
    },
];
