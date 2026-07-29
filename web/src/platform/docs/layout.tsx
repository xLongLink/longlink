import ArticleLayout from '@/layout/ArticleLayout';
import type { ArticlePage } from '@/platform/catalog';
import { DOC_GROUPS } from '@/platform/docs/catalog';

/** Extends the side layout with documentation navigation and article content. */
export default function DocsLayout({ page }: { page: ArticlePage }) {
    return <ArticleLayout groups={DOC_GROUPS} page={page} />;
}
