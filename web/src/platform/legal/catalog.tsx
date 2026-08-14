import { createElement } from 'react';
import type { ArticlePage } from '@/lib/articles';
import { legalPages } from '@/platform/pages';

export const LEGAL_PAGES: ArticlePage[] = legalPages.map(({ Component, metadata }) => ({
    ...metadata,
    breadcrumbs: [
        { title: 'Home', path: '/' },
        { title: metadata.title, path: metadata.path },
    ],
    content: createElement(Component),
    metadata,
}));

export const LEGAL_GROUPS = [
    {
        title: 'Legal',
        items: LEGAL_PAGES.map(({ title, path }) => ({ title, path })),
    },
];
