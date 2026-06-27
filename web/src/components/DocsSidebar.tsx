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
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarSeparator,
} from '@ui/sidebar';

import { Wordmark } from '@/components/Wordmark';

export type DocsSidebarProps = {
    currentItemId?: string;
};

/** Renders a nested docs navigation item. */
function renderDocNavigationItem(
    item: DocNavigationItem,
    currentItemId?: string
) {
    const isActive = currentItemId === item.id;

    return (
        <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
                render={<Link to={item.path} />}
                isActive={isActive}
                variant={isActive ? 'outline' : 'default'}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                    'text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground',
                    isActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                )}
            >
                <item.icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                {item.title}
            </SidebarMenuButton>

            {item.children?.length ? (
                <SidebarMenuSub>
                    {item.children.map((child) => {
                        const isChildActive = currentItemId === child.id;

                        return (
                            <SidebarMenuSubItem key={child.id}>
                                <SidebarMenuSubButton
                                    render={<Link to={child.path} />}
                                    isActive={isChildActive}
                                    aria-current={isChildActive ? 'page' : undefined}
                                    className={cn(
                                        'text-sidebar-foreground/70 hover:text-foreground',
                                        isChildActive && 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                                    )}
                                >
                                    <child.icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
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
export function DocsSidebar({ currentItemId }: DocsSidebarProps) {
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
                        <SidebarGroupLabel className="font-normal text-muted-foreground">{group.title}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu className="space-y-1">
                                {group.items.map((item) => renderDocNavigationItem(item, currentItemId))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
