import { useLocation, type MetaFunction } from 'react-router';
import { noIndexMeta, publicSeoMeta } from '@/lib/seo';
import { LEGAL_PAGES } from '@/platform/legal/catalog';
import LegalLayout from '@/platform/legal/layout';
import NotFound from '@/platform/NotFound';
import { normalizePathname } from '@/platform/paths';

/** Returns metadata for the legal article matched by the current URL. */
export const meta: MetaFunction = ({ location }) => {
    const page = LEGAL_PAGES.find((item) => item.path === normalizePathname(location.pathname));

    return page ? publicSeoMeta(page) : noIndexMeta('Not Found | LongLink');
};

/** Resolves and renders the legal article matched by the current URL. */
export default function LegalRoute() {
    const location = useLocation();
    const page = LEGAL_PAGES.find((item) => item.path === normalizePathname(location.pathname));

    return page ? <LegalLayout page={page} /> : <NotFound />;
}
