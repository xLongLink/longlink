import { Link, Outlet, useLocation } from 'react-router';

import { A } from '@/components/ui/a';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@/components/ui/breadcrumb';
import { Li } from '@/components/ui/li';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarSeparator,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Ul } from '@/components/ui/ul';

import { DOC_GROUPS } from './nav';
import { DOC_TOC } from './toc';

/** Renders the docs shell with sidebar navigation and routed content. */
export default function DocsLayout() {
    const location = useLocation();
    const currentGroup = DOC_GROUPS.find((group) =>
        group.items.some((item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`))
    );
    const currentItem = currentGroup?.items.find(
        (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
    );
    const pageLabel = currentItem?.title ?? 'Overview';
    const pagePath = currentItem?.path ?? '/docs';

    return (
        <SidebarProvider defaultOpen>
            <Sidebar
                side="left"
                variant="sidebar"
                collapsible="offcanvas"
                className="group-data-[side=left]:border-r-0"
            >
                <SidebarHeader className="gap-4 p-4">
                    <div className="flex items-center justify-center gap-2 text-base font-semibold text-card-foreground">
                        <span className="uppercase tracking-[-0.04em]">
                            <span className="text-accent">LONG</span>
                            <span className="text-white">LINK</span>
                        </span>
                    </div>
                </SidebarHeader>

                <SidebarSeparator />

                <SidebarContent>
                    {DOC_GROUPS.map((group) => (
                        <SidebarGroup key={group.title}>
                            <SidebarGroupLabel className="text-sidebar-foreground/45 font-normal">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {group.items.map((item) => {
                                        const isActive = location.pathname === item.path;

                                        return (
                                            <SidebarMenuItem key={item.id}>
                                                <SidebarMenuButton
                                                    render={<Link to={item.path} />}
                                                    isActive={isActive}
                                                    variant={isActive ? 'outline' : 'default'}
                                                    className="text-sidebar-foreground/70"
                                                >
                                                    <item.icon
                                                        className="size-4 shrink-0 text-muted-foreground/70"
                                                        aria-hidden="true"
                                                    />
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

            <SidebarInset className="bg-background">
                <div className="w-full p-2 lg:p-3">
                    <div className="relative min-h-[calc(100vh-1rem)] rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm lg:min-h-[calc(100vh-1.5rem)] lg:pr-72">
                        <div className="sticky top-2 z-20 border-b border-border bg-card/95 px-6 py-4 backdrop-blur-sm lg:top-3 lg:px-8">
                            <UIBreadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <SidebarTrigger className="shrink-0" />
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            render={(props) => (
                                                <Link
                                                    {...props}
                                                    to="/docs"
                                                    className="transition-colors hover:text-foreground"
                                                >
                                                    Documentation
                                                </Link>
                                            )}
                                        />
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            render={(props) => (
                                                <Link
                                                    {...props}
                                                    to={currentGroup?.items[0]?.path ?? '/docs'}
                                                    className="transition-colors hover:text-foreground"
                                                >
                                                    {currentGroup?.title ?? 'Overview'}
                                                </Link>
                                            )}
                                        />
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        <BreadcrumbLink
                                            render={(props) => (
                                                <Link {...props} to={pagePath} className="font-medium text-foreground">
                                                    {pageLabel}
                                                </Link>
                                            )}
                                        />
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </UIBreadcrumb>
                        </div>

                        <div className="min-w-0 px-6 py-8 lg:px-8 lg:py-10">
                            <Outlet />

                            <aside className="fixed top-28 right-8 hidden w-56 lg:block">
                                <div className="pl-5">
                                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                                        On this page
                                    </div>
                                    <nav aria-label="On this page" className="mt-4">
                                        <Ul className="space-y-2 text-sm">
                                            {(DOC_TOC[location.pathname] ?? []).map((item) => (
                                                <Li key={item.href} className={item.level === 3 ? 'pl-4' : ''}>
                                                    <A
                                                        href={item.href}
                                                        className="block text-muted-foreground transition-colors hover:text-foreground"
                                                    >
                                                        {item.label}
                                                    </A>
                                                </Li>
                                            ))}
                                        </Ul>
                                    </nav>
                                </div>
                            </aside>
                        </div>
                    </div>
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
