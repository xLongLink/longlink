import { Page } from '@/components/ui/page';
import { Separator } from '@/components/shadcn/separator';
import { Button } from '@/components/longlink/action/button';
import { PathBreadcrumb } from '@/components/ui/breadcrumbs';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { ArticleOutline, type ArticleOutlineItem } from './article-outline';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

/** Labels for public article route segments shared with visible breadcrumbs. */
const articleRouteLabels = {
    blog: 'Blog',
    billing: 'Billing',
    'why-longlink': 'Why LongLink',
    assets: 'Brand assets',
    values: 'Values',
    comunication: 'Communication'
} satisfies Record<string, string>;

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
});

export type ArticleMetadata = {
    title: string;
    description: string;
    lastUpdated: string;
    editUrl: string;
    toc: readonly ArticleOutlineItem[];
};

/** Publishes public articles with Home-rooted navigation and optional collection reading order. */
export function PublicArticle({
    article,
    children,
    paths
}: {
    article: ArticleMetadata;
    children: ReactNode;
    paths?: readonly string[];
}) {
    // Keep public navigation Home-rooted within the article's reading columns.
    return (
        <Page description={article.description} title={article.title}>
            <header className="mx-auto box-border flex h-16 w-full max-w-[1064px] items-center px-6">
                <div className="mx-auto flex w-full min-w-0 max-w-[1016px] gap-6">
                    <div className="mx-auto flex min-w-0 max-w-[720px] flex-1 flex-col">
                        <PathBreadcrumb labels={articleRouteLabels} root={{ label: 'Home', href: '/' }} />
                    </div>
                    {article.toc.length ? (
                        <div aria-hidden="true" className="hidden w-56 flex-none min-[64rem]:flex" />
                    ) : null}
                </div>
            </header>
            <div className="p-6">
                <div className="mx-auto flex w-full min-w-0 max-w-[1016px] gap-6">
                    <div className="mx-auto flex min-w-0 max-w-[720px] flex-1 flex-col">
                        <article className="space-y-7 [&_:is(h2,h3,h4,h5,h6):not(dialog_*)]:[margin-block-start:calc(var(--spacing)*8)] [&_p]:opacity-90">
                            {children}
                            <ArticleFooter lastUpdated={article.lastUpdated} editUrl={article.editUrl} paths={paths} />
                        </article>
                    </div>
                    {article.toc.length ? <ArticleOutline items={article.toc} /> : null}
                </div>
            </div>
        </Page>
    );
}

/** Renders article metadata and navigation through the collection selected by its caller. */
export function ArticleFooter({
    lastUpdated,
    editUrl,
    paths = []
}: {
    lastUpdated: string;
    editUrl?: string;
    paths?: readonly string[];
}) {
    // Resolve adjacent pages only within the caller's reading order.
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const pagePath = pathname.replace(/\/+$/, '') || '/';
    const currentPage = paths.indexOf(pagePath);
    const isCollectionPage = currentPage >= 0;
    const previousPage = paths[currentPage - 1];
    const nextPage = paths[currentPage + 1];

    // Keep unmodified arrow shortcuts available outside native text-entry controls.
    const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        // Leave text-entry controls and sliders available for their native arrow-key behavior.
        if (
            event.target instanceof HTMLElement &&
            event.target.closest('input, textarea, select, [contenteditable="true"], [role="slider"]')
        ) {
            return;
        }

        // Navigate only when the collection has a page in the requested direction.
        const destination =
            event.key === 'ArrowLeft' ? previousPage : event.key === 'ArrowRight' ? nextPage : undefined;

        if (destination === undefined) {
            return;
        }

        // Match button navigation and let the router restore the reading position.
        event.preventDefault();
        void navigate(`${destination}/`);
    });

    // Scope the document listener to articles that belong to a reading collection.
    useEffect(() => {
        if (!isCollectionPage) {
            return;
        }

        // Release the listener when the article leaves the collection or unmounts.
        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isCollectionPage]);

    // Preserve boundary buttons, modification dates, and optional source links.
    return (
        <footer className="flex flex-col gap-3 pt-8 pb-30">
            {isCollectionPage ? (
                <nav aria-label="Article page navigation" className="flex w-full items-center justify-between gap-3">
                    {previousPage === undefined ? (
                        <Button type="button" variant="secondary" disabled aria-keyshortcuts="ArrowLeft">
                            <ArrowLeft aria-hidden size={16} />
                            Previous
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            render={<RouterLink to={`${previousPage}/`} />}
                            nativeButton={false}
                            aria-keyshortcuts="ArrowLeft"
                        >
                            <ArrowLeft aria-hidden size={16} />
                            Previous
                        </Button>
                    )}
                    {nextPage === undefined ? (
                        <Button type="button" variant="secondary" disabled aria-keyshortcuts="ArrowRight">
                            Next
                            <ArrowRight aria-hidden size={16} />
                        </Button>
                    ) : (
                        <Button
                            variant="secondary"
                            render={<RouterLink to={`${nextPage}/`} />}
                            nativeButton={false}
                            aria-keyshortcuts="ArrowRight"
                        >
                            Next
                            <ArrowRight aria-hidden size={16} />
                        </Button>
                    )}
                </nav>
            ) : null}
            <Separator />
            <div className="flex w-full flex-wrap items-center justify-between gap-3 font-sans text-sm leading-(--text-sm--line-height) font-normal text-muted-foreground">
                <span>{`Last updated: ${dateFormatter.format(new Date(lastUpdated))}`}</span>
                {editUrl ? (
                    <a
                        className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:text-[color-mix(in_srgb,var(--primary),var(--foreground)_15%)] focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-ring focus-visible:outline-offset-2"
                        href={editUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Edit this page
                        <ExternalLink aria-hidden size={12} />
                        <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                ) : null}
            </div>
        </footer>
    );
}
