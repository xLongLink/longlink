import { createElement } from 'react';
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
    ShieldCheck,
    Waypoints,
} from 'lucide-react';
import type { ArticleBreadcrumb, ArticleNavigationItem, ArticlePage } from '@/lib/articles';
import { documentationPages } from '@/platform/pages';
import { pageReferenceDocPages } from '@/platform/docs/sdk/pages/index';

type DocGroupTitle = 'Overview' | 'Platform' | 'Applications';

type DocNavigationPage = ArticlePage & {
    children?: DocNavigationPage[];
    hiddenPages?: ArticlePage[];
};

type DocPageOptions = Omit<ArticlePage, 'breadcrumbs'> & {
    children?: DocPageOptions[];
    hiddenPages?: Array<Omit<ArticlePage, 'breadcrumbs'>>;
};

const [
    introductionDocumentation,
    platformDocumentation,
    organizationsDocumentation,
    apiApplicationsDocumentation,
    applicationsDocumentation,
    environmentsDocumentation,
    routesDocumentation,
    storageDocumentation,
    databaseDocumentation,
    pagesDocumentation,
    testingDocumentation,
    buildingDocumentation,
] = documentationPages;

const documentationBreadcrumb = { title: 'Documentation', path: introductionDocumentation.metadata.path };
const platformBreadcrumb = { title: 'Platform', path: platformDocumentation.metadata.path };
const applicationsBreadcrumb = { title: 'Applications', path: applicationsDocumentation.metadata.path };
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
    const childPages = children?.map((child) => docPage(group, child, breadcrumbs)) ?? [];
    const resolvedHiddenPages = hiddenPages?.map((hiddenPage) => docPage(group, hiddenPage, breadcrumbs)) ?? [];

    return {
        ...page,
        breadcrumbs,
        ...(childPages.length ? { children: childPages } : {}),
        ...(resolvedHiddenPages.length ? { hiddenPages: resolvedHiddenPages } : {}),
    };
}

/** Builds one docs sidebar section from page definitions. */
function docSection(title: DocGroupTitle, items: DocPageOptions[]) {
    return { title, items: items.map((item) => docPage(title, item)) };
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

/** Converts a documentation registry entry into a renderable article page. */
function documentationPage(
    { Component, metadata }: (typeof documentationPages)[number],
    icon: ArticlePage['icon']
): DocPageOptions {
    return { ...metadata, icon, content: createElement(Component), metadata };
}

const DOC_SECTIONS = [
    docSection('Overview', [
        documentationPage(introductionDocumentation, createElement(BookOpen, { 'aria-hidden': true, size: 16 })),
    ]),
    docSection('Platform', [
        documentationPage(platformDocumentation, createElement(ShieldCheck, { 'aria-hidden': true, size: 16 })),
        documentationPage(organizationsDocumentation, createElement(Building2, { 'aria-hidden': true, size: 16 })),
        documentationPage(apiApplicationsDocumentation, createElement(AppWindow, { 'aria-hidden': true, size: 16 })),
    ]),
    docSection('Applications', [
        documentationPage(applicationsDocumentation, createElement(Package, { 'aria-hidden': true, size: 16 })),
        documentationPage(environmentsDocumentation, createElement(Globe, { 'aria-hidden': true, size: 16 })),
        documentationPage(routesDocumentation, createElement(Waypoints, { 'aria-hidden': true, size: 16 })),
        documentationPage(storageDocumentation, createElement(HardDrive, { 'aria-hidden': true, size: 16 })),
        documentationPage(databaseDocumentation, createElement(Database, { 'aria-hidden': true, size: 16 })),
        {
            ...documentationPage(pagesDocumentation, createElement(FileCode2, { 'aria-hidden': true, size: 16 })),
            hiddenPages: pageReferenceDocPages,
        },
        documentationPage(testingDocumentation, createElement(FlaskConical, { 'aria-hidden': true, size: 16 })),
        documentationPage(buildingDocumentation, createElement(Rocket, { 'aria-hidden': true, size: 16 })),
    ]),
];

export const DOC_PAGES = DOC_SECTIONS.flatMap((section) => flattenDocPages(section.items));

export const DOC_GROUPS = DOC_SECTIONS.map((section) => ({
    title: section.title,
    items: section.items.map(navigationItem),
}));
