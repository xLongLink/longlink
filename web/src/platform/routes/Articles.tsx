import { useLocation, type MetaFunction } from 'react-router';
import type { ArticleNavigationGroup, ArticlePage } from '@/lib/articles';
import { publicSeoMeta } from '@/lib/seo';
import NotFound from '@/platform/NotFound';
import SideLayout from '@/layout/SideLayout';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import { normalizePathname } from '@/lib/paths';

/** Creates route metadata for one article catalog. */
export function createArticleMeta(pages: ArticlePage[]): MetaFunction {
    return ({ location }) => {
        const page = pages.find((item) => item.path === normalizePathname(location.pathname));

        return page
            ? publicSeoMeta(page)
            : [{ title: 'Not Found | LongLink' }, { name: 'robots', content: 'noindex, nofollow' }];
    };
}

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

/** Resolves and renders one article from its catalog and navigation groups. */
export function ArticleRoute({
    groups,
    pages,
    hasPageNavigation = false,
}: {
    groups: ArticleNavigationGroup[];
    pages: ArticlePage[];
    hasPageNavigation?: boolean;
}) {
    const location = useLocation();
    const pageIndex = pages.findIndex((item) => item.path === normalizePathname(location.pathname));
    const page = pages[pageIndex];

    return page ? (
        <ArticlePageRenderer
            groups={groups}
            nextPage={hasPageNavigation ? pages[pageIndex + 1] : undefined}
            page={page}
            previousPage={hasPageNavigation ? pages[pageIndex - 1] : undefined}
        />
    ) : (
        <NotFound />
    );
}
