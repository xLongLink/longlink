import './article.css';
import { Page } from '@/components/page';
import { Divider } from '@/components/custom/divider';
import { documentationPaths } from '@/platform/publications';
import { PathBreadcrumb } from '@/components/breadcrumb/path';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { BreadcrumbItem } from '@/components/breadcrumb/breadcrumbs';
import { ArticleOutline, type ArticleOutlineItem } from './article-outline';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router';

/** Labels for public article route segments shared with visible breadcrumbs. */
const articleRouteLabels = {
    api: 'Platform',
    blog: 'Blog',
    billing: 'Billing',
    docs: 'Documentation',
    'why-longlink': 'Why LongLink',
    sdk: 'Solutions',
    views: 'Views',
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

type ArticleMetadata = {
    title: string;
    description: string;
    lastUpdated: string;
    editUrl: string;
    toc: readonly ArticleOutlineItem[];
};

/** Publishes authored documentation within one shared metadata and navigation shell. */
export function DocumentationArticle({ article, children }: { article: ArticleMetadata; children: ReactNode }) {
    // Keep documentation typography and reading order as wrapper-owned policy.
    return (
        <ArticleRenderer
            article={article}
            className="[--text-body-size:var(--font-size-lg)] [--article-heading-spacing:calc(var(--spacing-9)*2)] [&_:is(.native-heading,.view-heading):not(dialog_*)]:tracking-wide"
            paths={documentationPaths}
        >
            {children}
        </ArticleRenderer>
    );
}

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
    // Keep public navigation Home-rooted without imposing typography or a reading collection.
    return (
        <ArticleRenderer article={article} paths={paths} root={<BreadcrumbItem href="/">Home</BreadcrumbItem>}>
            {children}
        </ArticleRenderer>
    );
}

/** Renders authored articles with the typography and navigation policy selected by their wrapper. */
function ArticleRenderer({
    article,
    children,
    className,
    paths,
    root
}: {
    article: ArticleMetadata;
    children: ReactNode;
    className?: string;
    paths?: readonly string[];
    root?: ReactNode;
}) {
    // Keep public articles and documentation in the same flat reading columns.
    return (
        <Page description={article.description} title={article.title}>
            <header className="article-header">
                <div className="article-columns">
                    <div className="article-reading-column">
                        <PathBreadcrumb className="min-w-0 overflow-hidden" labels={articleRouteLabels} root={root} />
                    </div>
                    {article.toc.length ? <div aria-hidden="true" className="article-outline-spacer" /> : null}
                </div>
            </header>
            <div className="article-content">
                <div className="article-columns">
                    <div className="article-reading-column">
                        <article
                            className={`space-y-7 [&_:is(h2,h3,h4,h5,h6):not(dialog_*)]:[margin-block-start:var(--article-heading-spacing,var(--spacing-8))] [&_p]:opacity-90${className ? ` ${className}` : ''}`}
                        >
                            {children}
                            <footer className="article-footer">
                                <ArticleFooter
                                    lastUpdated={article.lastUpdated}
                                    editUrl={article.editUrl}
                                    paths={paths}
                                />
                            </footer>
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
        if (currentPage < 0) {
            return;
        }

        // Release the listener when the article leaves the collection or unmounts.
        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentPage]);

    // Preserve boundary buttons, modification dates, and optional source links.
    return (
        <>
            {currentPage >= 0 ? (
                <nav aria-label="Article page navigation" className="article-page-navigation">
                    {previousPage === undefined ? (
                        <button
                            type="button"
                            className="article-page-link"
                            disabled
                            aria-disabled="true"
                            aria-keyshortcuts="ArrowLeft"
                        >
                            <ArrowLeft aria-hidden size={16} />
                            Previous
                        </button>
                    ) : (
                        <RouterLink className="article-page-link" to={`${previousPage}/`} aria-keyshortcuts="ArrowLeft">
                            <ArrowLeft aria-hidden size={16} />
                            Previous
                        </RouterLink>
                    )}
                    {nextPage === undefined ? (
                        <button
                            type="button"
                            className="article-page-link"
                            disabled
                            aria-disabled="true"
                            aria-keyshortcuts="ArrowRight"
                        >
                            Next
                            <ArrowRight aria-hidden size={16} />
                        </button>
                    ) : (
                        <RouterLink className="article-page-link" to={`${nextPage}/`} aria-keyshortcuts="ArrowRight">
                            Next
                            <ArrowRight aria-hidden size={16} />
                        </RouterLink>
                    )}
                </nav>
            ) : null}
            <Divider />
            <div className="article-metadata">
                <span>{`Last updated: ${dateFormatter.format(new Date(lastUpdated))}`}</span>
                {editUrl ? (
                    <a href={editUrl} target="_blank" rel="noopener noreferrer">
                        Edit this page
                        <ExternalLink aria-hidden size={12} />
                        <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                ) : null}
            </div>
        </>
    );
}
