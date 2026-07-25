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
import type { ArticleBreadcrumb, ArticleNavigationGroup, ArticleNavigationItem, ArticlePage } from '@/platform/catalog';
import { documentationPages } from '@/platform/public';
import { pageElementDocPages } from '@/platform/docs/sdk/elements';
import { content as docsIndexContent, metadata as docsIndexMetadata } from '@/platform/docs/index';
import { content as docsApiIndexContent, metadata as docsApiIndexMetadata } from '@/platform/docs/api/index';
import { content as docsSdkIndexContent, metadata as docsSdkIndexMetadata } from '@/platform/docs/sdk/index';
import { content as docsSdkPagesContent, metadata as docsSdkPagesMetadata } from '@/platform/docs/sdk/pages';
import { content as docsSdkRoutesContent, metadata as docsSdkRoutesMetadata } from '@/platform/docs/sdk/routes';
import { content as docsSdkStorageContent, metadata as docsSdkStorageMetadata } from '@/platform/docs/sdk/storage';
import { content as docsSdkTestingContent, metadata as docsSdkTestingMetadata } from '@/platform/docs/sdk/testing';
import { content as docsSdkBuildingContent, metadata as docsSdkBuildingMetadata } from '@/platform/docs/sdk/building';
import { content as docsSdkDatabaseContent, metadata as docsSdkDatabaseMetadata } from '@/platform/docs/sdk/database';
import {
    content as docsApiSelfHostedContent,
    metadata as docsApiSelfHostedMetadata,
} from '@/platform/docs/api/self-hosted';
import {
    content as docsApiApplicationsContent,
    metadata as docsApiApplicationsMetadata,
} from '@/platform/docs/api/applications';
import {
    content as docsSdkEnvironmentsContent,
    metadata as docsSdkEnvironmentsMetadata,
} from '@/platform/docs/sdk/environments';
import {
    content as docsApiOrganizationsContent,
    metadata as docsApiOrganizationsMetadata,
} from '@/platform/docs/api/organizations';

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

const documentationBreadcrumb: ArticleBreadcrumb = {
    title: 'Documentation',
    path: documentationPages.introduction.path,
};
const platformBreadcrumb: ArticleBreadcrumb = { title: 'Platform', path: documentationPages.platform.path };
const applicationsBreadcrumb: ArticleBreadcrumb = { title: 'Applications', path: documentationPages.sdk.path };
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
            ...documentationPages.introduction,
            icon: <BookOpen aria-hidden="true" size={16} />,
            content: docsIndexContent,
            metadata: docsIndexMetadata,
        },
    ]),
    docSection('Platform', [
        {
            ...documentationPages.platform,
            icon: <ShieldCheck aria-hidden="true" size={16} />,
            content: docsApiIndexContent,
            metadata: docsApiIndexMetadata,
        },
        {
            ...documentationPages.organizations,
            icon: <Building2 aria-hidden="true" size={16} />,
            content: docsApiOrganizationsContent,
            metadata: docsApiOrganizationsMetadata,
        },
        {
            ...documentationPages.applications,
            icon: <AppWindow aria-hidden="true" size={16} />,
            content: docsApiApplicationsContent,
            metadata: docsApiApplicationsMetadata,
        },
        {
            ...documentationPages.selfHosted,
            icon: <ServerCog aria-hidden="true" size={16} />,
            content: docsApiSelfHostedContent,
            metadata: docsApiSelfHostedMetadata,
        },
    ]),
    docSection('Applications', [
        {
            ...documentationPages.sdk,
            icon: <Package aria-hidden="true" size={16} />,
            content: docsSdkIndexContent,
            metadata: docsSdkIndexMetadata,
        },
        {
            ...documentationPages.environments,
            icon: <Globe aria-hidden="true" size={16} />,
            content: docsSdkEnvironmentsContent,
            metadata: docsSdkEnvironmentsMetadata,
        },
        {
            ...documentationPages.routes,
            icon: <Waypoints aria-hidden="true" size={16} />,
            content: docsSdkRoutesContent,
            metadata: docsSdkRoutesMetadata,
        },
        {
            ...documentationPages.storage,
            icon: <HardDrive aria-hidden="true" size={16} />,
            content: docsSdkStorageContent,
            metadata: docsSdkStorageMetadata,
        },
        {
            ...documentationPages.database,
            icon: <Database aria-hidden="true" size={16} />,
            content: docsSdkDatabaseContent,
            metadata: docsSdkDatabaseMetadata,
        },
        {
            ...documentationPages.pages,
            icon: <FileCode2 aria-hidden="true" size={16} />,
            content: docsSdkPagesContent,
            metadata: docsSdkPagesMetadata,
            routes: pageElementDocPages,
        },
        {
            ...documentationPages.testing,
            icon: <FlaskConical aria-hidden="true" size={16} />,
            content: docsSdkTestingContent,
            metadata: docsSdkTestingMetadata,
        },
        {
            ...documentationPages.building,
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
