import { useLocation } from 'react-router';
import type { ArticleNavigationGroup, ArticlePage } from '@/lib/articles';
import SideLayout from '@/layout/SideLayout';
import { Article } from '@/components/Article';
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
    const location = useLocation();

    return (
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={groups} />}>
            <Article page={page} previousPage={previousPage} nextPage={nextPage} />
        </SideLayout>
    );
}
