import { useLocation } from 'react-router';
import NotFound from '@/pages/NotFound';
import ArticleLayout from '@/layout/ArticleLayout';
import { LEGAL_GROUPS, LEGAL_PAGES } from '@/pages/legal/catalog';

/** Resolves legal paths inside the lazy-loaded legal route group. */
export default function LegalRoutes() {
    const location = useLocation();

    // Match the current path to its complete article definition.
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = LEGAL_PAGES.find((item) => item.path === pathname);
    if (!page) {
        return <NotFound />;
    }

    return <ArticleLayout page={page} navigationGroups={LEGAL_GROUPS} />;
}
