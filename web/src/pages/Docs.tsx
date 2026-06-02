import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { DOC_GROUPS, DocsSidebar, type DocItem } from '@/components/DocsSidebar';
import { A } from '@/components/ui/a';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@/components/ui/breadcrumb';
import { buttonVariants } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { apiUrl } from '@/lib/api';
import { cn } from '@/lib/utils';

type DocMetadata = {
    lastUpdated: string;
    editUrl: string;
};

type DocsPageProps = {
    content: ReactNode;
    metadata: DocMetadata;
};

type PageTocItem = {
    href: string;
    label: string;
};

/** Renders a docs page using the shared docs shell. */
export default function DocsPage({ content, metadata }: DocsPageProps) {
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
    const isRootDocsPage = pagePath === '/docs';
    const isSectionOverviewPage = !isRootDocsPage && currentItem?.id === currentGroup?.items[0]?.id;

    useEffect(() => {
        const contentElement = contentRef.current;
        let removeListeners = () => {};

        if (!contentElement) {
            setPageToc([]);
            setActivePageTocHref('');
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
    }, [location.pathname, content]);

    return (
        <SidebarProvider defaultOpen>
            <DocsSidebar currentItemId={currentItem?.id} />

            <SidebarInset className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-20 !w-auto overflow-hidden rounded-lg border border-border bg-background/0 transition-[left] lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2">
                <div className="flex h-full w-full flex-col shadow-sm">
                    <div className="pointer-events-auto relative shrink-0 border-b border-border bg-card">
                        <SidebarTrigger className="absolute top-1/2 left-4 z-10 shrink-0 -translate-y-1/2 cursor-pointer lg:left-6" />

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

                            <a
                                href={apiUrl('/auth/login/oidc')}
                                className={cn(
                                    buttonVariants({ size: 'sm' }),
                                    'absolute top-1/2 right-4 z-10 h-7 -translate-y-1/2 rounded-md bg-foreground px-3 text-xs text-background hover:bg-foreground/90 lg:right-6'
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
                            <DocArticle content={content} metadata={metadata} />
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
                                            const isActive = activePageTocHref === item.href;

                                            return (
                                                <div key={item.href} className="relative">
                                                    <span
                                                        aria-hidden="true"
                                                        className={`absolute left-[-0.5rem] top-1.5 h-5 w-0.5 rounded-full transition-colors ${
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

/** Renders a docs article with metadata footer. */
function DocArticle({ content, metadata }: { content: ReactNode; metadata?: DocMetadata }) {
    const lastUpdated = metadata?.lastUpdated
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
        <article className="mx-auto w-full max-w-2xl space-y-6">
            {content}
            {metadata?.lastUpdated || metadata?.editUrl ? (
                <footer className="flex flex-col gap-1 border-t border-border pt-4 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6">
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
