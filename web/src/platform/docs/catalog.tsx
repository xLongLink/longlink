import {
    AppWindow,
    BookOpen,
    Bot,
    Building2,
    Database,
    FileCode2,
    FlaskConical,
    Globe,
    HardDrive,
    Package,
    Rocket,
    ShieldCheck,
    Waypoints,
} from 'lucide-react';
import type { ArticleBreadcrumb, ArticleNavigationGroup, ArticleNavigationItem, ArticlePage } from '@/platform/catalog';
import * as agents from '@/platform/docs/agents';
import * as apiApplications from '@/platform/docs/api/applications';
import * as apiOverview from '@/platform/docs/api/index';
import * as apiOrganizations from '@/platform/docs/api/organizations';
import * as overview from '@/platform/docs/index';
import { documentationPages } from '@/platform/docs/pages';
import * as building from '@/platform/docs/sdk/building';
import * as database from '@/platform/docs/sdk/database';
import { pageElementDocPages } from '@/platform/docs/sdk/elements';
import * as environments from '@/platform/docs/sdk/environments';
import * as applicationsOverview from '@/platform/docs/sdk/index';
import * as pages from '@/platform/docs/sdk/pages';
import * as routes from '@/platform/docs/sdk/routes';
import * as storage from '@/platform/docs/sdk/storage';
import * as testing from '@/platform/docs/sdk/testing';

type DocGroupTitle = 'Overview' | 'Platform' | 'Applications';

type DocNavigationPage = ArticlePage & {
    children?: DocNavigationPage[];
    hiddenPages?: ArticlePage[];
};

type DocPageOptions = Omit<ArticlePage, 'breadcrumbs'> & {
    children?: DocPageOptions[];
    hiddenPages?: Array<Omit<ArticlePage, 'breadcrumbs'>>;
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
    { children, hiddenPages, ...page }: DocPageOptions,
    parentBreadcrumbs = docBreadcrumbsByGroup[group]
): DocNavigationPage {
    // Section overview pages use the parent breadcrumb; descendants append themselves.
    const breadcrumbs =
        parentBreadcrumbs.at(-1)?.path === page.path
            ? parentBreadcrumbs
            : [...parentBreadcrumbs, { title: page.title, path: page.path }];
    const articlePage = { ...page, breadcrumbs };
    const childPages = children?.map((child) => docPage(group, child, breadcrumbs)) ?? [];
    const resolvedHiddenPages = hiddenPages?.map((hiddenPage) => ({ ...hiddenPage, breadcrumbs })) ?? [];

    return {
        ...articlePage,
        ...(childPages.length ? { children: childPages } : {}),
        ...(resolvedHiddenPages.length ? { hiddenPages: resolvedHiddenPages } : {}),
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
function flattenDocPages(items: DocNavigationPage[]): ArticlePage[] {
    const pages: ArticlePage[] = [];

    // Visit every page in the navigation tree.
    for (const item of items) {
        pages.push(item, ...flattenDocPages(item.children ?? []), ...(item.hiddenPages ?? []));
    }

    return pages;
}

/** Converts a docs page into a sidebar navigation item. */
function navigationItem(page: DocNavigationPage): ArticleNavigationItem {
    return {
        title: page.title,
        path: page.path,
        icon: page.icon,
        ...(page.children?.length ? { children: page.children.map(navigationItem) } : {}),
    };
}

const DOC_SECTIONS: DocSection[] = [
    docSection('Overview', [
        {
            ...documentationPages.introduction,
            icon: <BookOpen aria-hidden="true" size={16} />,
            ...overview,
        },
    ]),
    docSection('Platform', [
        {
            ...documentationPages.platform,
            icon: <ShieldCheck aria-hidden="true" size={16} />,
            ...apiOverview,
        },
        {
            ...documentationPages.organizations,
            icon: <Building2 aria-hidden="true" size={16} />,
            ...apiOrganizations,
        },
        {
            ...documentationPages.applications,
            icon: <AppWindow aria-hidden="true" size={16} />,
            ...apiApplications,
        },
        {
            ...documentationPages.agents,
            icon: <Bot aria-hidden="true" size={16} />,
            ...agents,
        },
    ]),
    docSection('Applications', [
        {
            ...documentationPages.sdk,
            icon: <Package aria-hidden="true" size={16} />,
            ...applicationsOverview,
        },
        {
            ...documentationPages.environments,
            icon: <Globe aria-hidden="true" size={16} />,
            ...environments,
        },
        {
            ...documentationPages.routes,
            icon: <Waypoints aria-hidden="true" size={16} />,
            ...routes,
        },
        {
            ...documentationPages.storage,
            icon: <HardDrive aria-hidden="true" size={16} />,
            ...storage,
        },
        {
            ...documentationPages.database,
            icon: <Database aria-hidden="true" size={16} />,
            ...database,
        },
        {
            ...documentationPages.pages,
            icon: <FileCode2 aria-hidden="true" size={16} />,
            ...pages,
            hiddenPages: pageElementDocPages,
        },
        {
            ...documentationPages.testing,
            icon: <FlaskConical aria-hidden="true" size={16} />,
            ...testing,
        },
        {
            ...documentationPages.building,
            icon: <Rocket aria-hidden="true" size={16} />,
            ...building,
        },
    ]),
];

export const DOC_PAGES: ArticlePage[] = DOC_SECTIONS.flatMap((section) => flattenDocPages(section.items));

export const DOC_GROUPS: ArticleNavigationGroup[] = DOC_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.map(navigationItem),
}));
