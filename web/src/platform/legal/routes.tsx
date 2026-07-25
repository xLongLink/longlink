import { useLocation } from 'react-router';
import NotFound from '@/platform/NotFound';
import LegalLayout from '@/platform/legal/layout';
import { LEGAL_PAGES } from '@/platform/legal/catalog';

/** Resolves legal paths inside the lazy-loaded legal route group. */
export default function LegalRoutes() {
    const location = useLocation();

    // Match the current path to its complete article definition.
    const pathname = location.pathname.replace(/\/+$/, '') || '/';
    const page = LEGAL_PAGES.find((item) => item.path === pathname);
    if (!page) {
        return <NotFound />;
    }

    return <LegalLayout page={page} />;
}
