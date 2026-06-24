import { Link } from 'react-router';

import { DOC_GROUPS } from '@/pages/docs/catalog';
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
    SidebarSeparator,
} from '@ui/sidebar';

import { Wordmark } from '@/components/Wordmark';

export type DocsSidebarProps = {
    currentItemId?: string;
};

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
                                {group.items.map((item) => {
                                    const isActive = currentItemId === item.id;

                                    return (
                                        <SidebarMenuItem key={item.id}>
                                            <SidebarMenuButton
                                                render={<Link to={item.path} />}
                                                isActive={isActive}
                                                variant={isActive ? 'outline' : 'default'}
                                                className="text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground"
                                            >
                                                <item.icon className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                                                {item.title}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
        </Sidebar>
    );
}
