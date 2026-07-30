import { useLocation, type MetaFunction } from 'react-router';
import ArticleLayout from '@/layout/ArticleLayout';
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

    return page ? <ArticleLayout groups={groups} page={page} /> : <NotFound />;
}
