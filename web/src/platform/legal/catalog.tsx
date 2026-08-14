import { createElement } from 'react';
import type { ArticlePage } from '@/lib/articles';
import { legalPages } from '@/platform/legal/pages';

export const LEGAL_PAGES: ArticlePage[] = legalPages.map(({ Component, Icon, metadata }) => ({
    ...metadata,
    breadcrumbs: [
        { title: 'Home', path: '/' },
        { title: metadata.title, path: metadata.path },
    ],
    icon: createElement(Icon, { 'aria-hidden': true, size: 16 }),
    content: createElement(Component),
    metadata,
}));

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
