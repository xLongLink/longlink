import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Link } from '@astryxdesign/core/Link';
import { SideNav as AstryxSideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { Stack } from '@astryxdesign/core/Stack';
import { Wordmark } from '@/components/Wordmark';
import type { ArticleNavigationGroup, ArticleNavigationItem } from '@/platform/catalog';

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

    // Hidden docs routes should keep their closest visible section selected.
    if (currentPath.startsWith(`${item.path}/`) && item.path.split('/').filter(Boolean).length > 2) {
        return true;
    }

    return item.children?.some((child) => articleNavigationItemIsActive(child, currentPath)) ?? false;
}

/** Renders a nested article navigation item. */
function renderArticleNavigationItem(item: ArticleNavigationItem, currentPath: string) {
    const isSelected = articleNavigationItemIsActive(item, currentPath);
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
            header={
                <Stack className="-my-2">
                    <Center className="lg:mt-2" height={64} width="100%">
                        <Link href="/" label="LongLink home" color="inherit">
                            <Wordmark size="heading" />
                        </Link>
                    </Center>
                    <Stack paddingInline={2}>
                        <Divider />
                    </Stack>
                </Stack>
            }
        >
            {groups.map((group) => (
                <SideNavSection key={group.title} title={group.title}>
                    {group.items.map((item) => renderArticleNavigationItem(item, currentPath))}
                </SideNavSection>
            ))}
        </AstryxSideNav>
    );
}
