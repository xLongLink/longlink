import { useLocation, type MetaFunction } from 'react-router';
import NotFound from '@/platform/NotFound';
import LegalLayout from '@/platform/legal/layout';
import { LEGAL_PAGES } from '@/platform/legal/catalog';
import { noIndexMeta, publicSeoMeta } from '@/lib/seo';

/** Returns metadata for the legal article matched by the current URL. */
export const meta: MetaFunction = ({ location }) => {
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = LEGAL_PAGES.find((item) => item.path === pathname);

    return page ? publicSeoMeta(page) : noIndexMeta('Not Found | LongLink');
};

/** Resolves and renders the legal article matched by the current URL. */
export default function LegalRoute() {
    const pathname = useLocation().pathname.replace(/\/+$/, '') || '/';
    const page = LEGAL_PAGES.find((item) => item.path === pathname);

    return page ? <LegalLayout page={page} /> : <NotFound />;
}
