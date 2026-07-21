import {
    AppWindow,
    BookOpen,
    Building2,
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    HardDrive,
    Package,
    Rocket,
    ServerCog,
    ShieldCheck,
    Waypoints,
} from 'lucide-react';
import type { ArticleBreadcrumb, ArticleNavigationGroup, ArticleNavigationItem, ArticlePage } from '@/pages/catalog';
import { pageElementDocPages } from '@/pages/docs/sdk/elements';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/pages/docs/index';
import { content as docsApiIndexContent, metadata as docsApiIndexMetadata } from '@/pages/docs/api/index';
import { content as docsSdkIndexContent, metadata as docsSdkIndexMetadata } from '@/pages/docs/sdk/index';
import { content as docsSdkPagesContent, metadata as docsSdkPagesMetadata } from '@/pages/docs/sdk/pages';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/pages/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/pages/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/pages/docs/sdk/testing';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/pages/docs/sdk/building';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/pages/docs/sdk/database';
import {
    content as docsApiSelfHostedContent,
    metadata as docsApiSelfHostedMetadata,
} from '@/pages/docs/api/self-hosted';
import {
    content as docsApiApplicationsContent,
    metadata as docsApiApplicationsMetadata,
} from '@/pages/docs/api/applications';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/pages/docs/sdk/environments';
import {
    content as docsApiOrganizationsContent,
    metadata as docsApiOrganizationsMetadata,
} from '@/pages/docs/api/organizations';

type DocGroupTitle = 'Overview' | 'Platform' | 'Applications';

type GroupedDocPage = ArticlePage & { group: DocGroupTitle };

type DocNavigationPage = GroupedDocPage & {
    children?: DocNavigationPage[];
    routes?: DocNavigationPage[];
};

type DocPageOptions = Omit<ArticlePage, 'breadcrumbs'> & {
    children?: DocPageOptions[];
    routes?: DocPageOptions[];
};

type DocSection = {
    title: DocGroupTitle;
    items: DocNavigationPage[];
};

const documentationBreadcrumb: ArticleBreadcrumb = { title: 'Documentation', path: '/docs' };
const platformBreadcrumb: ArticleBreadcrumb = { title: 'Platform', path: '/docs/api' };
const applicationsBreadcrumb: ArticleBreadcrumb = { title: 'Applications', path: '/docs/sdk' };
const docBreadcrumbsByGroup: Record<DocGroupTitle, ArticleBreadcrumb[]> = {
    Overview: [documentationBreadcrumb],
    Platform: [documentationBreadcrumb, platformBreadcrumb],
    Applications: [documentationBreadcrumb, applicationsBreadcrumb],
};

/** Builds a docs navigation page with breadcrumbs derived from its section. */
function docPage(
    group: DocGroupTitle,
    { children, routes, ...page }: DocPageOptions,
    parentBreadcrumbs = docBreadcrumbsByGroup[group]
): DocNavigationPage {
    const parentBreadcrumb = parentBreadcrumbs.at(-1);

    // Section overview pages use the parent breadcrumb; descendants append themselves.
    const breadcrumbs =
        parentBreadcrumb?.path === page.path
            ? parentBreadcrumbs
            : [...parentBreadcrumbs, { title: page.title, path: page.path }];
    const articlePage = { ...page, group, breadcrumbs };
    const childPages = children?.map((child) => docPage(group, child, breadcrumbs)) ?? [];
    const routePages = routes?.map((route) => docPage(group, route, breadcrumbs)) ?? [];

    // Return leaf pages without nested navigation.
    if (!childPages.length && !routePages.length) {
        return articlePage;
    }

    return {
        ...articlePage,
        ...(childPages.length ? { children: childPages } : {}),
        ...(routePages.length ? { routes: routePages } : {}),
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

    // Visit every page in the navigation tree.
    for (const item of items) {
        pages.push(item);

        // Recurse into nested pages.
        if (item.children?.length) {
            pages.push(...flattenDocPages(item.children));
        }

        // Recurse into hidden routes excluded from sidebar navigation.
        if (item.routes?.length) {
            pages.push(...flattenDocPages(item.routes));
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

    // Preserve nested pages in sidebar items.
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
            icon: <BookOpen aria-hidden="true" size={16} />,
            content: docsIndexContent,
            metadata: docsIndexMetadata,
        },
    ]),
    docSection('Platform', [
        {
            title: 'Overview',
            path: '/docs/api',
            icon: <ShieldCheck aria-hidden="true" size={16} />,
            content: docsApiIndexContent,
            metadata: docsApiIndexMetadata,
        },
        {
            title: 'Organizations',
            path: '/docs/api/organizations',
            icon: <Building2 aria-hidden="true" size={16} />,
            content: docsApiOrganizationsContent,
            metadata: docsApiOrganizationsMetadata,
        },
        {
            title: 'Applications',
            path: '/docs/api/applications',
            icon: <AppWindow aria-hidden="true" size={16} />,
            content: docsApiApplicationsContent,
            metadata: docsApiApplicationsMetadata,
        },
        {
            title: 'Self-hosted',
            path: '/docs/api/self-hosted',
            icon: <ServerCog aria-hidden="true" size={16} />,
            content: docsApiSelfHostedContent,
            metadata: docsApiSelfHostedMetadata,
        },
    ]),
    docSection('Applications', [
        {
            title: 'Overview',
            path: '/docs/sdk',
            icon: <Package aria-hidden="true" size={16} />,
            content: docsSdkIndexContent,
            metadata: docsSdkIndexMetadata,
        },
        {
            title: 'Environments',
            path: '/docs/sdk/environments',
            icon: <Globe aria-hidden="true" size={16} />,
            content: docsSdkEnvironmentsContent,
            metadata: docsSdkEnvironmentsMetadata,
        },
        {
            title: 'Routes',
            path: '/docs/sdk/routes',
            icon: <Waypoints aria-hidden="true" size={16} />,
            content: docsSdkRoutesContent,
            metadata: docsSdkRoutesMetadata,
        },
        {
            title: 'Storage',
            path: '/docs/sdk/storage',
            icon: <HardDrive aria-hidden="true" size={16} />,
            content: docsSdkStorageContent,
            metadata: docsSdkStorageMetadata,
        },
        {
            title: 'Database',
            path: '/docs/sdk/database',
            icon: <Database aria-hidden="true" size={16} />,
            content: docsSdkDatabaseContent,
            metadata: docsSdkDatabaseMetadata,
        },
        {
            title: 'Pages',
            path: '/docs/sdk/pages',
            icon: <FileCode2 aria-hidden="true" size={16} />,
            content: docsSdkPagesContent,
            metadata: docsSdkPagesMetadata,
            routes: pageElementDocPages,
        },
        {
            title: 'Testing',
            path: '/docs/sdk/testing',
            icon: <FlaskConical aria-hidden="true" size={16} />,
            content: docsSdkTestingContent,
            metadata: docsSdkTestingMetadata,
        },
        {
            title: 'Building',
            path: '/docs/sdk/building',
            icon: <Rocket aria-hidden="true" size={16} />,
            content: docsSdkBuildingContent,
            metadata: docsSdkBuildingMetadata,
        },
    ]),
];

export const DOC_PAGES: GroupedDocPage[] = DOC_SECTIONS.flatMap((section) => flattenDocPages(section.items));

export const DOC_GROUPS: ArticleNavigationGroup[] = DOC_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.map(navigationItem),
}));
