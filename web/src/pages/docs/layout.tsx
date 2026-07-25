import { useLocation } from 'react-router';
import type { ArticlePage } from '@/pages/catalog';
import SideLayout from '@/layout/SideLayout';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import { DOC_GROUPS } from '@/pages/docs/catalog';

/** Extends the side layout with documentation navigation and article content. */
export default function DocsLayout({ page }: { page: ArticlePage }) {
    const location = useLocation();

    return (
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={DOC_GROUPS} />}>
            <Article page={page} />
        </SideLayout>
    );
}
