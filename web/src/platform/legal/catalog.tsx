import { createElement } from 'react';
import { FileText, Landmark, ShieldCheck } from 'lucide-react';
import type { ArticlePage } from '@/lib/articles';
import { legalPages } from '@/platform/legal/pages';

/** Builds a legal page with its standard Home breadcrumb. */
function legalPage(page: Omit<ArticlePage, 'breadcrumbs'>): ArticlePage {
    return {
        ...page,
        breadcrumbs: [
            { title: 'Home', path: '/' },
            { title: page.title, path: page.path },
        ],
    };
}

export const LEGAL_PAGES = legalPages.map(({ Component, metadata }, index) =>
    legalPage({
        ...metadata,
        icon: createElement([FileText, Landmark, ShieldCheck][index]!, { 'aria-hidden': true, size: 16 }),
        content: createElement(Component),
        metadata,
    })
);

export const LEGAL_GROUPS = [
    {
        title: 'Legal',
        items: LEGAL_PAGES.map((page) => ({
            title: page.title,
            path: page.path,
            icon: page.icon,
        })),
    },
];
