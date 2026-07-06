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

import type { ArticleBreadcrumb, ArticleNavigationGroup, ArticleNavigationItem, ArticlePage } from '@/pages/catalog';
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

type DocNavigationPage = GroupedDocPage & {
    children?: DocNavigationPage[];
};

type DocPageOptions = Omit<ArticlePage, 'breadcrumbs'> & {
    children?: DocPageOptions[];
};

type DocSection = {
    title: DocGroupTitle;
    items: DocNavigationPage[];
};

const documentationBreadcrumb: ArticleBreadcrumb = { title: 'Documentation', path: '/docs' };
const controlPlaneBreadcrumb: ArticleBreadcrumb = { title: 'Control Plane', path: '/docs/api' };
const applicationSdkBreadcrumb: ArticleBreadcrumb = { title: 'Application SDK', path: '/docs/sdk' };
const docBreadcrumbsByGroup: Record<DocGroupTitle, ArticleBreadcrumb[]> = {
    Overview: [documentationBreadcrumb],
    'Control Plane': [documentationBreadcrumb, controlPlaneBreadcrumb],
    'Application SDK': [documentationBreadcrumb, applicationSdkBreadcrumb],
};

/** Builds a docs navigation page with breadcrumbs derived from its section. */
function docPage(group: DocGroupTitle, { children, ...page }: DocPageOptions): DocNavigationPage {
    const groupBreadcrumbs = docBreadcrumbsByGroup[group];
    const sectionBreadcrumb = groupBreadcrumbs.at(-1);
    // Section overview pages use the section breadcrumb; child pages append themselves.
    const breadcrumbs =
        sectionBreadcrumb?.path === page.path
            ? groupBreadcrumbs
            : [...groupBreadcrumbs, { title: page.title, path: page.path }];
    const articlePage = { ...page, group, breadcrumbs };

    if (!children?.length) {
        return articlePage;
    }

    return {
        ...articlePage,
        children: children.map((child) => docPage(group, child)),
    };
}


/** Builds one docs sidebar section from page definitions. */
function docSection(title: DocGroupTitle, items: DocPageOptions[]): DocSection {
    return {
        title,
        items: items.map((item) => docPage(title, item)),
    };
}


/** Flattens sidebar pages into the route catalog. */
function flattenDocPages(items: DocNavigationPage[]): GroupedDocPage[] {
    const pages: GroupedDocPage[] = [];

    for (const item of items) {
        pages.push(item);

        if (item.children?.length) {
            pages.push(...flattenDocPages(item.children));
        }
    }

    return pages;
}


/** Converts a docs page into a sidebar navigation item. */
function navigationItem(page: DocNavigationPage): ArticleNavigationItem {
    const item: ArticleNavigationItem = {
        title: page.title,
        path: page.path,
        icon: page.icon,
    };

    if (page.children?.length) {
        item.children = page.children.map(navigationItem);
    }

    return item;
}


const DOC_SECTIONS: DocSection[] = [
    docSection('Overview', [
        {
            title: 'Introduction',
            path: '/docs',
            icon: BookOpen,
            content: docsIndexContent,
            metadata: docsIndexMetadata,
        },
    ]),
    docSection('Control Plane', [
        {
            title: 'Overview',
            path: '/docs/api',
            icon: ShieldCheck,
            content: docsApiIndexContent,
            metadata: docsApiIndexMetadata,
        },
        {
            title: 'Organizations',
            path: '/docs/api/organizations',
            icon: Building2,
            content: docsApiOrganizationsContent,
            metadata: docsApiOrganizationsMetadata,
        },
        {
            title: 'Applications',
            path: '/docs/api/applications',
            icon: Boxes,
            content: docsApiApplicationsContent,
            metadata: docsApiApplicationsMetadata,
        },
        {
            title: 'Self-hosted',
            path: '/docs/api/self-hosted',
            icon: ServerCog,
            content: docsApiSelfHostedContent,
            metadata: docsApiSelfHostedMetadata,
        },
    ]),
    docSection('Application SDK', [
        {
            title: 'Overview',
            path: '/docs/sdk',
            icon: Blocks,
            content: docsSdkIndexContent,
            metadata: docsSdkIndexMetadata,
        },
        {
            title: 'CLI Reference',
            path: '/docs/sdk/cli',
            icon: FileCode2,
            content: docsSdkCliContent,
            metadata: docsSdkCliMetadata,
        },
        {
            title: 'Environments',
            path: '/docs/sdk/environments',
            icon: Globe,
            content: docsSdkEnvironmentsContent,
            metadata: docsSdkEnvironmentsMetadata,
        },
        {
            title: 'Routes',
            path: '/docs/sdk/routes',
            icon: Waypoints,
            content: docsSdkRoutesContent,
            metadata: docsSdkRoutesMetadata,
        },
        {
            title: 'Storage',
            path: '/docs/sdk/storage',
            icon: HardDrive,
            content: docsSdkStorageContent,
            metadata: docsSdkStorageMetadata,
        },
        {
            title: 'Database',
            path: '/docs/sdk/database',
            icon: Database,
            content: docsSdkDatabaseContent,
            metadata: docsSdkDatabaseMetadata,
        },
        {
            title: 'Testing',
            path: '/docs/sdk/testing',
            icon: FlaskConical,
            content: docsSdkTestingContent,
            metadata: docsSdkTestingMetadata,
        },
        {
            title: 'Building',
            path: '/docs/sdk/building',
            icon: Rocket,
            content: docsSdkBuildingContent,
            metadata: docsSdkBuildingMetadata,
        },
        {
            title: 'Pages',
            path: '/docs/sdk/pages',
            icon: FileCode2,
            content: docsSdkPagesContent,
            metadata: docsSdkPagesMetadata,
            children: [
                {
                    title: 'Expressions',
                    path: '/docs/sdk/pages/expressions',
                    icon: FileCode2,
                    content: docsSdkExpressionsContent,
                    metadata: docsSdkExpressionsMetadata,
                },
                {
                    title: 'Layout',
                    path: '/docs/sdk/pages/layout',
                    icon: LayoutTemplate,
                    content: docsSdkLayoutContent,
                    metadata: docsSdkLayoutMetadata,
                },
                {
                    title: 'Components',
                    path: '/docs/sdk/pages/components',
                    icon: Blocks,
                    content: docsSdkComponentsContent,
                    metadata: docsSdkComponentsMetadata,
                },
            ],
        },
    ]),
];

export const DOC_PAGES: GroupedDocPage[] = DOC_SECTIONS.flatMap((section) => flattenDocPages(section.items));

export const DOC_GROUPS: ArticleNavigationGroup[] = DOC_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.map(navigationItem),
}));
