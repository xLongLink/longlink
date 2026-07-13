import { Link } from 'react-router';
import { ChevronDownIcon } from 'lucide-react';
import { useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import type { ArticleNavigationGroup, ArticleNavigationItem } from '@/pages/catalog';
import { cn } from '@/lib/utils';
import { Wordmark } from '@/components/Wordmark';
import {
    Sidebar as UISidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarSeparator,
} from '@/components/ui/sidebar';

export type SidebarProps = {
    currentPath: string;
    groups: ArticleNavigationGroup[];
};

/** Renders a nested article navigation item. */
function renderArticleNavigationItem(
    item: ArticleNavigationItem,
    currentPath: string,
    openItemPaths: Record<string, boolean>,
    setOpenItemPaths: Dispatch<SetStateAction<Record<string, boolean>>>
) {
    const isExactActive = currentPath === item.path;
    const hasActiveChild = item.children?.some((child) => articleNavigationItemIsActive(child, currentPath)) ?? false;
    const isOpen = openItemPaths[item.path] ?? hasActiveChild;

    /** Toggles a sidebar section without following the parent page link. */
    function handleToggle(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault();
        event.stopPropagation();

        setOpenItemPaths((current) => {
            const currentIsOpen = current[item.path] ?? hasActiveChild;

            return {
                ...current,
                [item.path]: !currentIsOpen,
            };
        });
    }

    return (
        <SidebarMenuItem
            key={item.path}
            className={cn(
                isExactActive &&
                    'before:absolute before:top-1 before:bottom-1 before:left-0 before:z-10 before:w-0.5 before:rounded-full before:bg-foreground'
            )}
        >
            <SidebarMenuButton
                render={<Link to={item.path} />}
                isActive={isExactActive}
                aria-current={isExactActive ? 'page' : undefined}
                className={cn(
                    'h-7 px-2.5 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground',
                    hasActiveChild && 'text-foreground',
                    isExactActive && 'bg-muted/80 font-medium text-foreground shadow-none'
                )}
            >
                {item.icon ? (
                    <item.icon
                        className={cn(
                            'size-3.5 shrink-0 text-muted-foreground/80 transition-colors',
                            (isExactActive || hasActiveChild) && 'text-foreground'
                        )}
                        aria-hidden="true"
                    />
                ) : null}
                {item.title}
            </SidebarMenuButton>

            {item.children?.length ? (
                <SidebarMenuAction
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.title}`}
                    aria-expanded={isOpen}
                    className="!-top-1.5 !right-0 h-10 w-28 cursor-pointer justify-end pr-3 after:-inset-2 md:after:block"
                    onClick={handleToggle}
                >
                    <ChevronDownIcon className={cn('size-3.5 transition-transform', !isOpen && '-rotate-90')} />
                </SidebarMenuAction>
            ) : null}

            {item.children?.length && isOpen ? (
                <SidebarMenuSub className="mx-3 gap-0.5 border-border/80 py-0 pr-0.5 pl-2">
                    {item.children.map((child) => {
                        const isChildActive = currentPath === child.path;

                        return (
                            <SidebarMenuSubItem
                                key={child.path}
                                className={cn(
                                    isChildActive &&
                                        'before:absolute before:top-1 before:bottom-1 before:-left-[0.7rem] before:z-10 before:w-0.5 before:rounded-full before:bg-foreground'
                                )}
                            >
                                <SidebarMenuSubButton
                                    render={<Link to={child.path} />}
                                    isActive={isChildActive}
                                    aria-current={isChildActive ? 'page' : undefined}
                                    className={cn(
                                        'h-7 px-2 text-[0.8125rem] text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground',
                                        isChildActive && 'bg-muted/70 font-medium text-foreground'
                                    )}
                                >
                                    {child.icon ? (
                                        <child.icon
                                            className={cn(
                                                'size-3.5 shrink-0 text-muted-foreground/80 transition-colors',
                                                isChildActive && 'text-foreground'
                                            )}
                                            aria-hidden="true"
                                        />
                                    ) : null}
                                    {child.title}
                                </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                        );
                    })}
                </SidebarMenuSub>
            ) : null}
        </SidebarMenuItem>
    );
}

/** Returns whether an article navigation item or descendant matches the current route. */
function articleNavigationItemIsActive(item: ArticleNavigationItem, currentPath: string): boolean {
    // Match direct routes before checking descendants.
    if (currentPath === item.path) {
        return true;
    }

    return item.children?.some((child) => articleNavigationItemIsActive(child, currentPath)) ?? false;
}

/** Renders the left navigation for article pages. */
export function Sidebar({ currentPath, groups }: SidebarProps) {
    const [openItemPaths, setOpenItemPaths] = useState<Record<string, boolean>>({});

    return (
        <UISidebar side="left" variant="sidebar" collapsible="offcanvas" className="group-data-[side=left]:border-r-0">
            <SidebarHeader className="h-[3.75rem] justify-center px-2 py-1.5 lg:h-[4.0625rem]">
                <Link
                    to="/"
                    onClick={() => window.scrollTo({ left: 0, top: 0 })}
                    className="flex cursor-pointer items-end justify-center gap-2 text-[1.375rem] font-semibold text-card-foreground transition-opacity hover:opacity-80"
                >
                    <Wordmark className="text-xl" />
                </Link>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                {groups.map((group) => (
                    <SidebarGroup key={group.title} className="px-2 py-2">
                        <SidebarGroupLabel className="h-6 px-2.5 text-[0.65rem] font-semibold uppercase tracking-normal text-muted-foreground">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-0.5">
                                {group.items.map((item) =>
                                    renderArticleNavigationItem(item, currentPath, openItemPaths, setOpenItemPaths)
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </UISidebar>
    );
}
