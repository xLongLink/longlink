import type { ArticleNavigationGroup } from '@/lib/articles';

export const LEGAL_GROUPS = [
    {
        title: 'Legal',
        items: [
            { title: 'Terms', path: '/terms' },
            { title: 'Impressum', path: '/impressum' },
            { title: 'Privacy', path: '/privacy' },
        ],
    },
] satisfies ArticleNavigationGroup[];
