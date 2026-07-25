import type { MetaFunction } from 'react-router';
import LegalRoutes from '@/pages/legal/routes';
import { LEGAL_PAGES } from '@/pages/legal/catalog';
import { articleSeoPage, publicSeoMeta } from '@/lib/seo';

/** Returns metadata for the legal article matched by the current URL. */
export const meta: MetaFunction = ({ location }) => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = LEGAL_PAGES.find((item) => item.path === pathname);

    return page ? publicSeoMeta(articleSeoPage(page)) : [];
};

export default LegalRoutes;
