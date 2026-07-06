import ArticleLayout from '@/layout/ArticleLayout';
import type { ArticlePage } from '@/pages/catalog';
import { LEGAL_GROUPS, LEGAL_PAGES } from '@/pages/legal/catalog';

type LegalPageRouteProps = {
    page: ArticlePage;
};

/** Renders one legal page inside the shared article shell. */
export default function LegalPageRoute({ page }: LegalPageRouteProps) {
    return (
        <ArticleLayout
            content={page.content}
            metadata={page.metadata}
            navigationGroups={LEGAL_GROUPS}
            navigationPages={LEGAL_PAGES}
        />
    );
}
