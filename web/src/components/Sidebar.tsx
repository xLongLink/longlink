import { Link } from '@astryxdesign/core/Link';
import { SideNav as AstryxSideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import type { ArticleNavigationGroup, ArticleNavigationItem } from '@/pages/catalog';
import { Wordmark } from '@/components/Wordmark';

export type SidebarProps = {
    currentPath: string;
    groups: ArticleNavigationGroup[];
};

/** Returns whether an article navigation item or descendant matches the current route. */
function articleNavigationItemIsActive(item: ArticleNavigationItem, currentPath: string): boolean {
    // Match direct routes before checking descendants.
    if (currentPath === item.path) {
        return true;
    }

    return item.children?.some((child) => articleNavigationItemIsActive(child, currentPath)) ?? false;
}

/** Renders a nested article navigation item. */
function renderArticleNavigationItem(item: ArticleNavigationItem, currentPath: string) {
    const isSelected = currentPath === item.path;
    const hasActiveChild = item.children?.some((child) => articleNavigationItemIsActive(child, currentPath)) ?? false;

    return (
        <SideNavItem
            key={item.path}
            collapsible={item.children?.length ? { defaultIsCollapsed: !hasActiveChild } : undefined}
            href={item.path}
            icon={item.icon}
            isSelected={isSelected}
            label={item.title}
            size="sm"
        >
            {item.children?.map((child) => renderArticleNavigationItem(child, currentPath))}
        </SideNavItem>
    );
}

/** Renders the left navigation for article pages. */
export function Sidebar({ currentPath, groups }: SidebarProps) {
    return (
        <AstryxSideNav
            className="docs-sidebar"
            style={{ width: '100%' }}
            header={
                <div className="flex h-16 w-full shrink-0 items-center justify-center border-b border-[var(--color-border)]">
                    <Link href="/" label="LongLink home" color="inherit">
                        <Wordmark className="tracking-normal" style={{ fontSize: '1.375rem' }} />
                    </Link>
                </div>
            }
        >
            {groups.map((group) => (
                <SideNavSection
                    key={group.title}
                    className="py-2 [&>div:first-child]:py-0.5 [&>div:last-child]:gap-0 [&>div:first-child>span:first-child>span:first-child]:text-[0.75rem] [&>div:first-child>span:first-child>span:first-child]:font-semibold [&>div:first-child>span:first-child>span:first-child]:tracking-normal [&>div:first-child>span:first-child>span:first-child]:text-[#9eb3c7] [&>div:first-child>span:first-child>span:first-child]:uppercase"
                    title={group.title}
                >
                    {group.items.map((item) => renderArticleNavigationItem(item, currentPath))}
                </SideNavSection>
            ))}
        </AstryxSideNav>
    );
}
