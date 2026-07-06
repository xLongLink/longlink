import ArticleLayout from '@/layout/ArticleLayout';
import type { ArticlePage } from '@/pages/catalog';

type DocsPageRouteProps = {
    page: ArticlePage;
};

/** Renders one docs page inside the shared docs shell. */
export default function DocsPageRoute({ page }: DocsPageRouteProps) {
    return <ArticleLayout content={page.content} metadata={page.metadata} />;
}
