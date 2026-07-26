import { useLocation, type MetaFunction } from 'react-router';
import { noIndexMeta, publicSeoMeta } from '@/lib/seo';
import { DOC_PAGES } from '@/platform/docs/catalog';
import DocsLayout from '@/platform/docs/layout';
import NotFound from '@/platform/NotFound';

/** Returns metadata for the documentation article matched by the current URL. */
export const meta: MetaFunction = ({ location }) => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = DOC_PAGES.find((item) => item.path === pathname);

    return page ? publicSeoMeta(page) : noIndexMeta('Not Found | LongLink');
};

/** Resolves and renders the documentation article matched by the current URL. */
export default function DocumentationRoute() {
    const pathname = useLocation().pathname.replace(/\/+$/, '') || '/';
    const page = DOC_PAGES.find((item) => item.path === pathname);

    return page ? <DocsLayout page={page} /> : <NotFound />;
}
