import ArticleLayout from '@/layout/ArticleLayout';
import type { ArticlePage } from '@/platform/catalog';
import { LEGAL_GROUPS } from '@/platform/legal/catalog';

/** Extends the side layout with legal navigation and article content. */
export default function LegalLayout({ page }: { page: ArticlePage }) {
    return <ArticleLayout groups={LEGAL_GROUPS} page={page} />;
}
