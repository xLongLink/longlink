import { useLocation } from 'react-router';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import SideLayout from '@/layout/SideLayout';
import type { ArticlePage } from '@/platform/catalog';
import { DOC_GROUPS } from '@/platform/docs/catalog';

/** Extends the side layout with documentation navigation and article content. */
export default function DocsLayout({ page }: { page: ArticlePage }) {
    const location = useLocation();

    return (
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={DOC_GROUPS} />}>
            <Article page={page} />
        </SideLayout>
    );
}
