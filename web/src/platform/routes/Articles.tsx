import type { ArticleNavigationGroup, ArticlePage } from '@/lib/articles';
import SideLayout from '@/layout/SideLayout';
import { Article } from '@/layout/Article';
import { Sidebar } from '@/components/Sidebar';

/** Renders a resolved article with its sidebar navigation. */
export function ArticlePageRenderer({
    groups,
    page,
    previousPage,
    nextPage,
}: {
    groups: ArticleNavigationGroup[];
    page: ArticlePage;
    previousPage?: Pick<ArticlePage, 'path' | 'title'>;
    nextPage?: Pick<ArticlePage, 'path' | 'title'>;
}) {
    return (
        <SideLayout sideNav={<Sidebar groups={groups} />}>
            <Article page={page} previousPage={previousPage} nextPage={nextPage} />
        </SideLayout>
    );
}
