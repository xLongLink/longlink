import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { DocsSidebar } from '@/components/DocsSidebar';
import { DOC_GROUPS, DOC_PAGES, type DocItem, type DocNavigationItem } from '@/pages/docs/catalog';
import { A } from '@ui/a';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@ui/breadcrumb';
import { buttonVariants } from '@ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@ui/sidebar';
import { cn } from '@/lib/utils';

type DocMetadata = {
    lastUpdated?: string;
    editUrl?: string;
};

type DocsLayoutProps = {
    content: ReactNode;
    metadata: DocMetadata;
};

type PageTocItem = {
    href: string;
    label: string;
};

/** Finds a docs navigation item by id in a nested item list. */
function findDocNavigationItem(items: DocNavigationItem[], itemId?: string): DocNavigationItem | undefined {
    for (const item of items) {
        if (item.id === itemId) {
            return item;
        }

        const childMatch = item.children ? findDocNavigationItem(item.children, itemId) : undefined;

        if (childMatch) {
            return childMatch;
        }
    }

    return undefined;
}

/** Renders a docs page using the shared docs layout. */
export default function DocsLayout({ content, metadata }: DocsLayoutProps) {
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [pageToc, setPageToc] = useState<PageTocItem[]>([]);

    // Prefer the longest matching path so nested pages do not resolve to their section overview.
    const currentItem = DOC_PAGES.reduce<DocItem | undefined>((match, item) => {
        const isPathMatch = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        if (!isPathMatch) {
            return match;
        }

        if (!match || item.path.length > match.path.length) {
            return item;
        }

        return match;
    }, undefined);
    const currentGroup = DOC_GROUPS.find((group) => findDocNavigationItem(group.items, currentItem?.id));
    const pageLabel = currentItem?.title ?? 'Overview';
    const pagePath = currentItem?.path ?? '/docs';
    const isRootDocsPage = pagePath === '/docs';
    const isSectionOverviewPage = !isRootDocsPage && currentItem?.id === currentGroup?.items[0]?.id;

    useEffect(() => {
        const contentElement = contentRef.current;

        if (!contentElement) {
            setPageToc([]);
            return;
        }

        // Wait for the routed docs content to commit before reading generated heading ids.
        const frame = window.requestAnimationFrame(() => {
            const headings = Array.from(contentElement.querySelectorAll<HTMLHeadingElement>('h2[id]'))
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
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [location.pathname, content]);

    return (
        <SidebarProvider defaultOpen>
            <DocsSidebar currentItemId={currentItem?.id} />

            <SidebarInset className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-20 !w-auto overflow-hidden rounded-lg border border-border bg-background/0 lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2">
                <div className="flex h-full w-full flex-col shadow-sm">
                    <div className="pointer-events-auto relative shrink-0 border-b border-border bg-card">
                        <SidebarTrigger className="absolute top-1/2 left-4 z-10 shrink-0 -translate-y-1/2 cursor-pointer active:!-translate-y-1/2 lg:left-6" />

                        <div className="grid h-14 lg:grid-cols-[minmax(0,1fr)_14rem]">
                            <div className="min-w-0 px-4 lg:px-6">
                                <div className="mx-auto flex h-full w-full max-w-[56rem] items-center">
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
                            </div>

                            <Link
                                to="/organizations"
                                className={cn(
                                    buttonVariants({ size: 'sm' }),
                                    'absolute top-0 bottom-0 right-4 z-10 my-auto h-7 rounded-md bg-foreground px-3 text-xs text-background hover:bg-foreground/90 lg:right-6'
                                )}
                            >
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </SidebarInset>

            <div className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-0 rounded-lg bg-card lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed top-0 right-1 left-1 z-[15] h-[5px] bg-background lg:right-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:h-[9px] lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed right-1 bottom-0 left-1 z-[15] h-1 bg-background lg:right-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:h-2 lg:peer-data-[state=collapsed]:left-2" />
            <div className="pointer-events-none fixed top-0 bottom-0 left-0 z-[15] w-[5px] bg-background lg:left-[calc(var(--sidebar-width)-1px)] lg:w-[9px] lg:peer-data-[state=collapsed]:left-0" />
            <div className="pointer-events-none fixed top-0 right-0 bottom-0 z-[15] w-[5px] bg-background lg:w-[9px]" />

            <div className="relative z-10 w-full px-1 pb-1 pt-[4.25rem] lg:px-2 lg:pb-2 lg:pt-[4.375rem]">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_14rem]">
                    <div ref={contentRef} className="px-4 pt-4 pb-32 lg:px-6 lg:pt-6 lg:pb-40">
                        <div className="mx-auto w-full max-w-[56rem]">
                            <div className="mx-auto w-full max-w-2xl">
                                <DocArticle content={content} metadata={metadata} />
                            </div>
                        </div>
                    </div>

                    <aside className="hidden px-5 pt-4 pb-8 lg:fixed lg:top-[4.5rem] lg:right-2 lg:block lg:h-[calc(100vh-5rem)] lg:w-56 lg:overflow-y-auto lg:pt-6">
                        <div className="relative pl-4">
                            <div className="pointer-events-none absolute top-0 bottom-0 left-[0.55rem] w-px bg-border" />
                            <div className="flex flex-col gap-4">
                                <div className="pl-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                                    On this page
                                </div>
                                <nav aria-label="On this page">
                                    <div className="space-y-1.5 text-sm">
                                        {pageToc.map((item) => {
                                            return (
                                                <div key={item.href} className="relative">
                                                    <A
                                                        href={item.href}
                                                        className="block pl-3 text-muted-foreground no-underline transition-colors hover:text-foreground"
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

function DocArticle({ content, metadata }: DocsLayoutProps) {
    const lastUpdated = metadata.lastUpdated
        ? (() => {
              const parsedDate = new Date(metadata.lastUpdated);

              return Number.isNaN(parsedDate.getTime())
                  ? metadata.lastUpdated
                  : new Intl.DateTimeFormat('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    }).format(parsedDate);
          })()
        : '';

    return (
        <article className="space-y-6 text-base leading-7 text-foreground [&_h1>a]:-left-8 [&_h1>a]:top-0 [&_h1>a]:translate-y-0 [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h2>a]:-left-7 [&_h2>a]:top-[0.6em] [&_h2]:mt-8 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2 [&_h3>a]:-left-6 [&_h3>a]:top-[0.6em] [&_h3]:mt-6 [&_h3]:border-b [&_h3]:border-border [&_h3]:pb-2 [&_h4>a]:-left-5 [&_h4>a]:top-[0.6em] [&_h4]:mt-4 [&_h4]:border-b [&_h4]:border-border [&_h4]:pb-2">
            {content}
            {metadata.lastUpdated || metadata.editUrl ? (
                <footer className="mt-8 flex flex-col gap-1 border-t border-border pt-4 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    {metadata.lastUpdated ? <span>Last updated: {lastUpdated}</span> : <span />}
                    {metadata.editUrl ? (
                        <A href={metadata.editUrl} target="_blank" rel="noopener noreferrer">
                            Edit this page in GitHub
                        </A>
                    ) : null}
                </footer>
            ) : null}
        </article>
    );
}
