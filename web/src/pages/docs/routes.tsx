import { useLocation } from 'react-router';
import NotFound from '@/pages/NotFound';
import ArticleLayout from '@/layout/ArticleLayout';
import { DOC_GROUPS, DOC_PAGES } from '@/pages/docs/catalog';

/** Resolves documentation paths inside the lazy-loaded documentation route group. */
export default function DocumentationRoutes() {
    const location = useLocation();

    // Match the current path to its complete article definition.
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = DOC_PAGES.find((item) => item.path === pathname);
    if (!page) {
        return <NotFound />;
    }

    return <ArticleLayout page={page} navigationGroups={DOC_GROUPS} />;
}
