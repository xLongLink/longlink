import { useTranslation } from '@/lib/i18n';
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router';

import { ArticleSidebar } from '@/components/ArticleSidebar';
import { cn, formatDate } from '@/lib/utils';
import type { ArticleBreadcrumb, ArticleItem, ArticleMetadata, ArticleNavigationGroup } from '@/pages/catalog';
import { DOC_GROUPS, DOC_PAGES } from '@/pages/docs/catalog';
import { A } from '@ui/a';
import {
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbSeparator,
    Breadcrumb as UIBreadcrumb,
} from '@ui/breadcrumb';
import { buttonVariants } from '@ui/button';
import { ScrollArea } from '@ui/scroll-area';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@ui/sidebar';

type ArticleLayoutProps = {
    content: ReactNode;
    metadata: ArticleMetadata;
    breadcrumbs?: ArticleBreadcrumb[];
    navigationGroups?: ArticleNavigationGroup[];
    navigationPages?: ArticleItem[];
};

type ArticleContentProps = Pick<ArticleLayoutProps, 'content' | 'metadata'>;

type PageTocItem = {
    href: string;
    label: string;
};

/** Renders an article page using the shared documentation shell. */
export default function ArticleLayout({
    content,
    metadata,
    breadcrumbs,
    navigationGroups = DOC_GROUPS,
    navigationPages = DOC_PAGES,
}: ArticleLayoutProps) {
    const { t } = useTranslation();
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [activeTocHref, setActiveTocHref] = useState('');
    const [pageToc, setPageToc] = useState<PageTocItem[]>([]);

    // Prefer the longest matching path so nested pages do not resolve to their section overview.
    const currentItem = navigationPages.reduce<ArticleItem | undefined>((match, item) => {
        const isPathMatch = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);

        if (!isPathMatch) {
            return match;
        }

        if (!match || item.path.length > match.path.length) {
            return item;
        }

        return match;
    }, undefined);
    const currentBreadcrumbs = breadcrumbs ?? currentItem?.breadcrumbs ?? [];

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
                    const label = heading.textContent?.trim() ?? '';

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

    useEffect(() => {
        if (!pageToc.length) {
            setActiveTocHref('');
            return;
        }

        const headingElements = pageToc
            .map((item) => document.getElementById(item.href.slice(1)))
            .filter((heading): heading is HTMLElement => Boolean(heading));

        const activeOffset = 112;

        /** Returns the heading nearest to the fixed docs header. */
        function getActiveHeadingHref(): string {
            let nextActiveHref = pageToc[0]?.href ?? '';

            // Keep the previous heading active until the next heading passes under the header.
            for (const heading of headingElements) {
                if (heading.getBoundingClientRect().top > activeOffset) {
                    break;
                }

                nextActiveHref = `#${heading.id}`;
            }

            return nextActiveHref;
        }

        /** Commits the active heading without re-rendering when it has not changed. */
        function setNextActiveHeading(nextActiveHref: string): void {
            setActiveTocHref((currentHref) => (currentHref === nextActiveHref ? currentHref : nextActiveHref));
        }

        if (location.hash && pageToc.some((item) => item.href === location.hash)) {
            setNextActiveHeading(location.hash);
        } else {
            setNextActiveHeading(getActiveHeadingHref());
        }

        const observer = new IntersectionObserver(
            () => {
                setNextActiveHeading(getActiveHeadingHref());
            },
            {
                rootMargin: `-${activeOffset}px 0px -70% 0px`,
                threshold: 0,
            }
        );

        for (const heading of headingElements) {
            observer.observe(heading);
        }

        return () => {
            observer.disconnect();
        };
    }, [location.hash, pageToc]);

    return (
        <SidebarProvider defaultOpen>
            <ArticleSidebar currentItemId={currentItem?.id} currentPath={location.pathname} groups={navigationGroups} />

            <SidebarInset className="pointer-events-none fixed top-1 right-1 bottom-1 left-1 z-20 !w-auto overflow-hidden rounded-lg border border-border bg-background/0 lg:top-2 lg:right-2 lg:bottom-2 lg:left-[calc(var(--sidebar-width)+0.5rem)] lg:peer-data-[state=collapsed]:left-2">
                <div className="flex h-full w-full flex-col shadow-sm">
                    <div className="pointer-events-auto relative shrink-0 border-b border-border bg-card">
                        <SidebarTrigger className="absolute top-1/2 left-4 z-10 shrink-0 -translate-y-1/2 cursor-pointer active:!-translate-y-1/2 lg:left-6" />

                        <div className="grid h-14 lg:grid-cols-[minmax(0,1fr)_14rem]">
                            <div className="min-w-0 px-4 lg:px-6">
                                <div className="mx-auto flex h-full w-full max-w-[60rem] items-center">
                                    <div className="mx-auto w-full max-w-3xl">
                                        <UIBreadcrumb>
                                            <BreadcrumbList>
                                                {currentBreadcrumbs.map((item, index) => {
                                                    const isLast = index === currentBreadcrumbs.length - 1;

                                                    return (
                                                        <Fragment key={item.path}>
                                                            {index > 0 ? <BreadcrumbSeparator /> : null}
                                                            <BreadcrumbItem>
                                                                <BreadcrumbLink
                                                                    render={(props) => (
                                                                        <Link
                                                                            {...props}
                                                                            to={item.path}
                                                                            className={cn(
                                                                                'transition-colors hover:text-foreground',
                                                                                isLast && 'font-medium text-foreground'
                                                                            )}
                                                                        >
                                                                            {item.title}
                                                                        </Link>
                                                                    )}
                                                                />
                                                            </BreadcrumbItem>
                                                        </Fragment>
                                                    );
                                                })}
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
                                {t('actions.login')}
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
                        <div className="mx-auto w-full max-w-[60rem]">
                            <div className="mx-auto w-full max-w-3xl">
                                <ArticleContent content={content} metadata={metadata} />
                            </div>
                        </div>
                    </div>

                    <aside className="hidden px-5 pt-4 pb-8 lg:fixed lg:top-[4.5rem] lg:right-2 lg:flex lg:h-[calc(100vh-5rem)] lg:w-56 lg:pt-6">
                        <div className="relative flex min-h-0 flex-1 pl-4">
                            <div className="pointer-events-none absolute top-0 bottom-0 left-4 w-px bg-border" />
                            <div className="flex min-h-0 flex-1 flex-col gap-4">
                                <div className="shrink-0 pl-4 text-[0.68rem] font-semibold uppercase tracking-normal text-foreground">
                                    {t('common.onThisPage')}
                                </div>
                                <ScrollArea className="-mr-3 min-h-0 flex-1 pr-3">
                                    <nav aria-label="On this page">
                                        <div className="space-y-1 text-sm">
                                            {pageToc.map((item) => {
                                                const isActive = activeTocHref === item.href;

                                                return (
                                                    <div key={item.href} className="relative">
                                                        <A
                                                            href={item.href}
                                                            className={cn(
                                                                'relative block py-1 pl-4 text-muted-foreground no-underline transition-colors before:absolute before:top-1 before:bottom-1 before:left-0 before:w-px before:rounded-full before:bg-transparent hover:text-foreground',
                                                                isActive &&
                                                                    'font-medium text-foreground before:bg-foreground'
                                                            )}
                                                        >
                                                            {item.label}
                                                        </A>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </nav>
                                </ScrollArea>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </SidebarProvider>
    );
}

function ArticleContent({ content, metadata }: ArticleContentProps) {
    const { t } = useTranslation();
    const lastUpdated = metadata.lastUpdated
        ? (() => {
              const parsedDate = new Date(metadata.lastUpdated);

              return Number.isNaN(parsedDate.getTime()) ? metadata.lastUpdated : formatDate(parsedDate);
          })()
        : '';

    return (
        <article className="space-y-7 text-[1.0625rem] leading-8 text-muted-foreground [&>div]:gap-5 [&_[data-slot=code-block]]:max-w-3xl [&_a]:font-medium [&_code]:text-foreground [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-4 [&_h1]:text-[2.5rem] [&_h1]:leading-[1.08] [&_h1]:font-semibold [&_h1]:tracking-normal [&_h1]:text-foreground [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-border/80 [&_h2]:pb-3 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:tracking-normal [&_h2]:text-foreground [&_h3]:mt-7 [&_h3]:border-b [&_h3]:border-border/70 [&_h3]:pb-2 [&_h3]:text-[1.35rem] [&_h3]:leading-snug [&_h3]:tracking-normal [&_h3]:text-foreground [&_h4]:mt-5 [&_h4]:border-b [&_h4]:border-border/70 [&_h4]:pb-2 [&_h4]:text-xl [&_h4]:tracking-normal [&_h4]:text-foreground [&_li]:leading-7 [&_p]:max-w-3xl sm:[&_h1]:text-[3.25rem] sm:[&_h1]:leading-[1.05] sm:[&_h2]:text-[2rem] sm:[&_h3]:text-[1.45rem]">
            {content}
            {metadata.lastUpdated || metadata.editUrl ? (
                <footer className="mt-8 flex flex-col gap-1 border-t border-border pt-4 text-xs font-medium text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    {metadata.lastUpdated ? <span>{t('common.lastUpdated', { date: lastUpdated })}</span> : <span />}
                    {metadata.editUrl ? (
                        <A href={metadata.editUrl} target="_blank" rel="noopener noreferrer">
                            {t('docs.editInGithub')}
                        </A>
                    ) : null}
                </footer>
            ) : null}
        </article>
    );
}
