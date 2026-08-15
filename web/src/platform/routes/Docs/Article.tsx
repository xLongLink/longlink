import type { ReactNode } from 'react';
import type { ArticlePage } from '@/lib/articles';
import { Article } from '@/layout/Article';
import { Documentation } from '@/platform/layouts/Documentation';
import { DOCUMENTATION_PAGES } from '@/platform/routes/Docs/navigation';

type DocMetadata = Omit<ArticlePage, 'breadcrumbs' | 'content' | 'icon' | 'metadata'> & ArticlePage['metadata'];

/** Renders route-local documentation content inside the shared article layout. */
export function DocsArticle({ children, metadata }: { children: ReactNode; metadata: DocMetadata }) {
    const pageIndex = DOCUMENTATION_PAGES.findIndex((page) => page.path === metadata.path);
    const breadcrumbs =
        metadata.path === '/docs'
            ? [{ title: 'Documentation', path: '/docs' }]
            : metadata.path.startsWith('/docs/api')
              ? [
                    { title: 'Documentation', path: '/docs' },
                    { title: 'Platform', path: '/docs/api' },
                    ...(metadata.path === '/docs/api' ? [] : [{ title: metadata.title, path: metadata.path }]),
                ]
              : [
                    { title: 'Documentation', path: '/docs' },
                    { title: 'Applications', path: '/docs/sdk' },
                    ...(metadata.path.startsWith('/docs/sdk/pages/')
                        ? [{ title: 'Pages', path: '/docs/sdk/pages' }]
                        : []),
                    ...(metadata.path === '/docs/sdk' ? [] : [{ title: metadata.title, path: metadata.path }]),
                ];

    return (
        <Documentation>
            <Article
                nextPage={DOCUMENTATION_PAGES[pageIndex + 1]}
                page={{ ...metadata, breadcrumbs, content: children, metadata }}
                previousPage={DOCUMENTATION_PAGES[pageIndex - 1]}
            />
        </Documentation>
    );
}
