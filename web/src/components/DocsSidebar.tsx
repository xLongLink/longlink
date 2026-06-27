import { useState, type Dispatch, type MouseEvent, type SetStateAction } from 'react';
import { Link } from 'react-router';

import { cn } from '@/lib/utils';
import { DOC_GROUPS, type DocNavigationItem } from '@/pages/docs/catalog';
import {
    Sidebar,
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
} from '@ui/sidebar';
import { ChevronDownIcon } from 'lucide-react';

import { Wordmark } from '@/components/Wordmark';

export type DocsSidebarProps = {
    currentItemId?: string;
    currentPath: string;
};

/** Renders a nested docs navigation item. */
function renderDocNavigationItem(
    item: DocNavigationItem,
    currentItemId: string | undefined,
    currentPath: string,
    openItemIds: Record<string, boolean>,
    setOpenItemIds: Dispatch<SetStateAction<Record<string, boolean>>>
) {
    const isExactActive = currentItemId === item.id || currentPath === item.path;
    const isOpen = openItemIds[item.id] ?? true;

    /** Toggles a docs sidebar section without following the parent page link. */
    function handleToggle(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault();
        event.stopPropagation();

        setOpenItemIds((current) => ({
            ...current,
            [item.id]: !(current[item.id] ?? true),
        }));
    }

    return (
        <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
                render={<Link to={item.path} />}
                isActive={isExactActive}
                variant={isExactActive ? 'outline' : 'default'}
                aria-current={isExactActive ? 'page' : undefined}
                className={cn(
                    'text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground',
                    isExactActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                )}
            >
                {item.icon ? (
                    <item.icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                ) : null}
                {item.title}
            </SidebarMenuButton>

            {item.children?.length ? (
                <SidebarMenuAction
                    aria-label={`${isOpen ? 'Collapse' : 'Expand'} ${item.title}`}
                    aria-expanded={isOpen}
                    onClick={handleToggle}
                >
                    <ChevronDownIcon className={cn('transition-transform', !isOpen && '-rotate-90')} />
                </SidebarMenuAction>
            ) : null}

            {item.children?.length && isOpen ? (
                <SidebarMenuSub>
                    {item.children.map((child) => {
                        const isChildActive = currentItemId === child.id || currentPath === child.path;

                        return (
                            <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton
                                    render={<Link to={child.path} />}
                                    isActive={isChildActive}
                                    aria-current={isChildActive ? 'page' : undefined}
                                    className={cn(
                                        'text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground',
                                        isChildActive &&
                                            'bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[0_0_0_1px_var(--sidebar-border)]'
                                    )}
                                >
                                    {child.icon ? (
                                        <child.icon
                                            className="size-4 shrink-0 text-muted-foreground/70"
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

/** Renders the left navigation for the docs experience. */
export function DocsSidebar({ currentItemId, currentPath }: DocsSidebarProps) {
    const [openItemIds, setOpenItemIds] = useState<Record<string, boolean>>({
        pages: true,
    });

    return (
        <Sidebar side="left" variant="sidebar" collapsible="offcanvas" className="group-data-[side=left]:border-r-0">
            <SidebarHeader className="h-12 justify-end p-2">
                <Link
                    to="/"
                    className="flex cursor-pointer items-end justify-center gap-2 text-[1.375rem] font-semibold text-card-foreground transition-opacity hover:opacity-80"
                >
                    <Wordmark className="text-lg" />
                </Link>
            </SidebarHeader>

            <SidebarSeparator />

            <SidebarContent>
                {DOC_GROUPS.map((group) => (
                    <SidebarGroup key={group.title} className="px-2 py-1">
                        <SidebarGroupLabel className="font-normal text-muted-foreground">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-1">
                                {group.items.map((item) =>
                                    renderDocNavigationItem(
                                        item,
                                        currentItemId,
                                        currentPath,
                                        openItemIds,
                                        setOpenItemIds
                                    )
                                )}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
