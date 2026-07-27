import { useLocation } from 'react-router';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import SideLayout from '@/layout/SideLayout';
import type { ArticlePage } from '@/platform/catalog';
import { LEGAL_GROUPS } from '@/platform/legal/catalog';

/** Extends the side layout with legal navigation and article content. */
export default function LegalLayout({ page }: { page: ArticlePage }) {
    const location = useLocation();

    return (
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={LEGAL_GROUPS} />}>
            <Article page={page} />
        </SideLayout>
    );
}
