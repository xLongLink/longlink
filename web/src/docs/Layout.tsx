import { useEffect, useRef, useState } from 'react';
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
import type { DocItem } from './types';

type PageTocItem = {
    href: string;
    label: string;
    level: 1 | 2 | 3;
};

/** Renders the docs shell with sidebar navigation and routed content. */
export default function DocsLayout() {
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [pageToc, setPageToc] = useState<PageTocItem[]>([]);
    // Prefer the longest matching path so nested pages do not resolve to their section overview.
    const currentItem = DOC_GROUPS.flatMap((group) => group.items).reduce<DocItem | undefined>((match, item) => {
        const isPathMatch = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        if (!isPathMatch) {
            return match;
        }

        if (!match || item.path.length > match.path.length) {
            return item;
        }

        return match;
    }, undefined);
    const currentGroup = DOC_GROUPS.find((group) => group.items.some((item) => item.id === currentItem?.id));
    const pageLabel = currentItem?.title ?? 'Overview';
    const pagePath = currentItem?.path ?? '/docs';

    useEffect(() => {
        const content = contentRef.current;

        if (!content) {
            setPageToc([]);
            return;
        }

        // Wait for the routed docs content to commit before reading generated heading ids.
        const frame = window.requestAnimationFrame(() => {
            const nextPageToc = Array.from(content.querySelectorAll<HTMLHeadingElement>('h1[id], h2[id], h3[id]'))
                .filter((heading) => heading.id)
                .map((heading) => {
                    const label = Array.from(heading.childNodes)
                        .filter((node) => node.nodeName.toLowerCase() !== 'a')
                        .map((node) => node.textContent ?? '')
                        .join(' ')
                        .trim();

                    return {
                        href: `#${heading.id}`,
                        label,
                        level: Number(heading.tagName.slice(1)) as 1 | 2 | 3,
                    };
                })
                .filter((item) => item.label);

            setPageToc(nextPageToc);
        });

        return () => window.cancelAnimationFrame(frame);
    }, [location.pathname]);

    return (
        <SidebarProvider defaultOpen>
            <Sidebar
                side="left"
                variant="sidebar"
                collapsible="offcanvas"
                className="group-data-[side=left]:border-r-0"
            >
                <SidebarHeader className="gap-4 p-4">
                    <Link
                        to="/"
                        className="flex cursor-pointer items-center justify-center gap-2 text-xl font-semibold text-card-foreground transition-opacity hover:opacity-80"
                    >
                        <span className="uppercase tracking-[-0.05em]">
                            <span className="text-accent">LONG</span>
                            <span className="text-white">LINK</span>
                        </span>
                    </Link>
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
                                        const isActive = currentItem?.id === item.id;

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

            <SidebarInset className="fixed top-1 right-0 bottom-0 left-1 !w-auto bg-background transition-[left] lg:top-2 lg:right-0 lg:bottom-0 lg:left-[calc(var(--sidebar-width)+0.25rem)] lg:peer-data-[state=collapsed]:left-2">
                <div className="h-full w-full pb-1 pl-1 pt-1 lg:pb-2 lg:pt-0">
                    <div className="grid h-full min-h-0 rounded-lg border border-border bg-card/80 shadow-sm backdrop-blur-sm lg:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="shrink-0 border-b border-border bg-card/80 px-4 py-4 backdrop-blur-sm lg:col-span-2 lg:px-6">
                            <UIBreadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <SidebarTrigger className="shrink-0 cursor-pointer" />
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

                        <div className="min-h-0 overflow-y-auto lg:col-span-2">
                            <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_14rem]">
                                <div ref={contentRef} className="px-4 py-8 lg:px-6 lg:py-10">
                                    <div className="mx-auto w-full max-w-[56rem]">
                                        <Outlet />
                                    </div>
                                </div>

                                <aside className="hidden border-l border-border px-5 py-8 lg:block">
                                    <div className="sticky top-8">
                                        <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/60">
                                            On this page
                                        </div>
                                        <nav aria-label="On this page" className="mt-4">
                                            <Ul className="space-y-2 text-sm">
                                                {pageToc.map((item) => (
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
                </div>
            </SidebarInset>
        </SidebarProvider>
    );
}
