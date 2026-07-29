import { useLocation } from 'react-router';
import { Article } from '@/components/Article';
import { Sidebar } from '@/components/Sidebar';
import type { ArticleNavigationGroup, ArticlePage } from '@/platform/catalog';
import SideLayout from './SideLayout';

/** Renders article content with its configured sidebar navigation. */
export default function ArticleLayout({ groups, page }: { groups: ArticleNavigationGroup[]; page: ArticlePage }) {
    const location = useLocation();

    return (
        <SideLayout sideNav={<Sidebar currentPath={location.pathname} groups={groups} />}>
            <Article page={page} />
        </SideLayout>
    );
}
