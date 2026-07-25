import type { MetaFunction } from 'react-router';
import { DOC_PAGES } from '@/pages/docs/catalog';
import DocumentationRoutes from '@/pages/docs/routes';
import { articleSeoPage, publicSeoMeta } from '@/lib/seo';

/** Returns metadata for the documentation article matched by the current URL. */
export const meta: MetaFunction = ({ location }) => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = DOC_PAGES.find((item) => item.path === pathname);

    return page ? publicSeoMeta(articleSeoPage(page)) : [];
};

export default DocumentationRoutes;
