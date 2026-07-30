import { useLocation, type MetaFunction } from 'react-router';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import SideLayout from '@/layout/SideLayout';
import { noIndexMeta, publicSeoMeta } from '@/lib/seo';
import type { ArticleNavigationGroup, ArticlePage } from '@/platform/catalog';
import NotFound from '@/platform/NotFound';
import { normalizePathname } from '@/platform/paths';

/** Creates route metadata for one article catalog. */
export function createArticleMeta(pages: ArticlePage[]): MetaFunction {
    return ({ location }) => {
        const page = pages.find((item) => item.path === normalizePathname(location.pathname));

        return page ? publicSeoMeta(page) : noIndexMeta('Not Found | LongLink');
    };
}

/** Resolves and renders one article from its catalog and navigation groups. */
export function ArticleRoute({ groups, pages }: { groups: ArticleNavigationGroup[]; pages: ArticlePage[] }) {
    const location = useLocation();
    const page = pages.find((item) => item.path === normalizePathname(location.pathname));

    return page ? (
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={groups} />}>
            <Article page={page} />
        </SideLayout>
    ) : (
        <NotFound />
    );
}
