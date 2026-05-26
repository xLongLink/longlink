import { PencilLine } from 'lucide-react';
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
import { buttonVariants } from '@/components/ui/button';
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
import { Wordmark } from '@/components/Wordmark';
import { apiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

import { getDocsEditUrl, getDocsLastUpdated } from './meta';
import { DOC_GROUPS } from './nav';
import type { DocItem } from './types';

type PageTocItem = {
    href: string;
    label: string;
};

/** Renders the docs shell with sidebar navigation and routed content. */
export default function DocsLayout() {
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [pageToc, setPageToc] = useState<PageTocItem[]>([]);
    const [activePageTocHref, setActivePageTocHref] = useState('');
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
    const docsEditUrl = getDocsEditUrl(pagePath);
    const lastUpdated = getDocsLastUpdated(pagePath);
    const isRootDocsPage = pagePath === '/docs';
    const isSectionOverviewPage = !isRootDocsPage && currentItem?.id === currentGroup?.items[0]?.id;

    useEffect(() => {
        const content = contentRef.current;
        let removeListeners = () => {};

        if (!content) {
            setPageToc([]);
            setActivePageTocHref('');
            return;
        }

        // Wait for the routed docs content to commit before reading generated heading ids.
        const frame = window.requestAnimationFrame(() => {
            const headings = Array.from(content.querySelectorAll<HTMLHeadingElement>('h2[id]'))
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
                    };
                })
                .filter((item) => item.label);

            setPageToc(headings);

            const updateActivePageTocHref = () => {
                // Mark the current section from the top-most visible heading.
                const nextActiveHref =
                    headings
                        .map((item) => ({
                            href: item.href,
                            top:
                                document.querySelector(item.href)?.getBoundingClientRect().top ??
                                Number.POSITIVE_INFINITY,
                        }))
                        .filter((item) => item.top <= 120)
                        .at(-1)?.href ??
                    headings[0]?.href ??
                    '';

                setActivePageTocHref(nextActiveHref);
            };

            updateActivePageTocHref();

            window.addEventListener('scroll', updateActivePageTocHref, { passive: true });
            window.addEventListener('resize', updateActivePageTocHref);

            removeListeners = () => {
                window.removeEventListener('scroll', updateActivePageTocHref);
                window.removeEventListener('resize', updateActivePageTocHref);
            };
        });

        return () => {
            window.cancelAnimationFrame(frame);
            removeListeners();
        };
    }, [location.pathname]);

    return (
        <SidebarProvider defaultOpen>
            <Sidebar
                side="left"
                variant="sidebar"
                collapsible="offcanvas"
                className="group-data-[side=left]:border-r-0"
            >
                <SidebarHeader className="h-12 justify-end p-2">
                    <Link
                        to="/"
                        className="flex cursor-pointer items-end justify-center gap-2 text-[1.375rem] font-semibold text-card-foreground transition-opacity hover:opacity-80"
                    >
                        <Wordmark className="text-base" />
                    </Link>
                </SidebarHeader>

                <SidebarSeparator />

                <SidebarContent>
                    {DOC_GROUPS.map((group) => (
                        <SidebarGroup key={group.title} className="px-2 py-1">
                            <SidebarGroupLabel className="text-muted-foreground font-normal">
                                {group.title}
                            </SidebarGroupLabel>
                            <SidebarGroupContent>
                                <SidebarMenu className="space-y-1">
                                    {group.items.map((item) => {
                                        const isActive = currentItem?.id === item.id;

                                        return (
                                            <SidebarMenuItem key={item.id}>
                                                <SidebarMenuButton
                                                    render={<Link to={item.path} />}
                                                    isActive={isActive}
                                                    variant={isActive ? 'outline' : 'default'}
                                                    className="text-sidebar-foreground/70 hover:bg-muted hover:text-foreground data-active:bg-muted data-active:text-foreground"
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

            <SidebarInset className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-20 !w-auto overflow-hidden rounded-lg border border-border bg-background/0 transition-[left] lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2">
                <div className="flex h-full w-full flex-col shadow-sm">
                    <div className="pointer-events-auto shrink-0 border-b border-border bg-card">
                        <div className="grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 lg:px-6">
                            <SidebarTrigger className="shrink-0 cursor-pointer" />

                            <div className="min-w-0 justify-self-center">
                                <div className="mx-auto w-full max-w-2xl">
                                    <UIBreadcrumb>
                                        <BreadcrumbList>
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
                                            {!isRootDocsPage ? (
                                                <>
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
                                                    {!isSectionOverviewPage ? (
                                                        <>
                                                            <BreadcrumbSeparator />
                                                            <BreadcrumbItem>
                                                                <BreadcrumbLink
                                                                    render={(props) => (
                                                                        <Link
                                                                            {...props}
                                                                            to={pagePath}
                                                                            className="font-medium text-foreground"
                                                                        >
                                                                            {pageLabel}
                                                                        </Link>
                                                                    )}
                                                                />
                                                            </BreadcrumbItem>
                                                        </>
                                                    ) : null}
                                                </>
                                            ) : null}
                                        </BreadcrumbList>
                                    </UIBreadcrumb>
                                </div>
                            </div>

                            <a
                                href={apiUrl('/auth/login/oidc')}
                                className={cn(
                                    buttonVariants({ size: 'sm' }),
                                    'h-7 rounded-md bg-foreground px-3 text-xs text-background hover:bg-foreground/90'
                                )}
                            >
                                Login
                            </a>
                        </div>
                    </div>
                </div>
            </SidebarInset>

            <div className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-0 rounded-lg bg-card transition-[left] lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed top-0 right-1 left-1 z-[15] h-[5px] bg-background transition-[left] lg:right-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:h-[9px] lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed right-1 bottom-0 left-1 z-[15] h-1 bg-background transition-[left] lg:right-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:h-2 lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed top-0 bottom-0 left-0 z-[15] w-[5px] bg-background lg:left-[calc(var(--sidebar-width)-1px)] lg:w-[9px] lg:peer-data-[state=collapsed]:left-0" />
            <div className="pointer-events-none fixed top-0 right-0 bottom-0 z-[15] w-[5px] bg-background lg:w-[9px]" />

            <div className="relative z-10 w-full px-1 pb-1 pt-[4.25rem] lg:px-2 lg:pb-2 lg:pt-[4.375rem]">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_14rem]">
                    <div ref={contentRef} className="px-4 pt-4 pb-32 lg:px-6 lg:pt-6 lg:pb-40">
                        <div className="mx-auto w-full max-w-[56rem]">
                            <Outlet />

                            <footer className="mx-auto mt-10 w-full max-w-2xl border-t border-border pt-4 text-xs font-medium text-muted-foreground">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                                    <A
                                        href={docsEditUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-accent no-underline transition-colors hover:opacity-80"
                                    >
                                        <PencilLine className="size-3.5" aria-hidden="true" />
                                        Edit this page in GitHub
                                    </A>
                                    <span>Last updated {lastUpdated}</span>
                                </div>
                            </footer>
                        </div>
                    </div>

                    <aside className="hidden px-5 pt-4 pb-8 lg:fixed lg:top-[4.5rem] lg:right-2 lg:block lg:h-[calc(100vh-5rem)] lg:w-56 lg:overflow-y-auto lg:pt-6">
                        <div className="relative pl-4">
                            <div className="pointer-events-none absolute top-1 bottom-1 left-[0.55rem] w-px bg-border" />
                            <div className="flex flex-col gap-4">
                                <div className="pl-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                    On this page
                                </div>
                                <nav aria-label="On this page">
                                    <div className="space-y-1.5 text-sm">
                                        {pageToc.map((item) => {
                                            const isActive = activePageTocHref === item.href;

                                            return (
                                                <div key={item.href} className="relative">
                                                    <span
                                                        aria-hidden="true"
                                                        className={`absolute left-[-0.55rem] top-1.5 h-5 w-px rounded-full transition-colors ${
                                                            isActive ? 'bg-primary' : 'bg-transparent'
                                                        }`}
                                                    />
                                                    <A
                                                        href={item.href}
                                                        className={`block pl-3 no-underline transition-colors hover:text-foreground ${
                                                            isActive ? 'text-foreground' : 'text-muted-foreground'
                                                        }`}
                                                    >
                                                        {item.label}
                                                    </A>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </nav>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </SidebarProvider>
    );
}
