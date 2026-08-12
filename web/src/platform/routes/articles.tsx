import { useLocation, type MetaFunction } from 'react-router';
import type { ArticleNavigationGroup, ArticlePage } from '@/platform/catalog';
import NotFound from '@/platform/NotFound';
import SideLayout from '@/layout/SideLayout';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import { normalizePathname } from '@/platform/paths';
import { noIndexMeta, publicSeoMeta } from '@/lib/seo';

/** Creates route metadata for one article catalog. */
export function createArticleMeta(pages: ArticlePage[]): MetaFunction {
    return ({ location }) => {
        const page = pages.find((item) => item.path === normalizePathname(location.pathname));

        return page ? publicSeoMeta(page) : noIndexMeta('Not Found | LongLink');
    };
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
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={groups} />}>
            <Article
                page={page}
                previousPage={hasPageNavigation ? pages[pageIndex - 1] : undefined}
                nextPage={hasPageNavigation ? pages[pageIndex + 1] : undefined}
            />
        </SideLayout>
    ) : (
        <NotFound />
    );
}
