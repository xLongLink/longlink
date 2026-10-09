import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { documentationPaths } from '@/platform/docs';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Article } from '@/components/layouts/Article';
import { useLocation, useNavigate } from 'react-router';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { useEffect, useEffectEvent, type ComponentProps, type ReactNode } from 'react';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
});

type ArticleMetadata = {
    title: string;
    description: string;
    lastUpdated: string;
    editUrl: string;
    toc: ComponentProps<typeof Outline>['items'];
};

type DocumentationArticleProps = {
    article: ArticleMetadata;
    children: ReactNode;
    className?: string;
};

/** Publishes authored documentation within one shared metadata and navigation shell. */
export function DocumentationArticle({
    article,
    children,
    className = 'documentation-content [--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:uppercase [&_.astryx-heading]:tracking-wide',
}: DocumentationArticleProps) {
    // Preserve the 720px reading column, 224px outline, 64px header, and caller-owned typography.
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                className={className}
                header={<PathBreadcrumb className="min-w-0 overflow-hidden" labels={articleRouteLabels} />}
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={
                    <ArticleFooter
                        lastUpdated={article.lastUpdated}
                        editUrl={article.editUrl}
                        paths={documentationPaths}
                    />
                }
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                {children}
            </Article>
        </>
    );
}

/** Publishes public articles with Home-rooted navigation and optional collection reading order. */
export function PublicArticle({
    article,
    children,
    paths,
}: {
    article: ArticleMetadata;
    children: ReactNode;
    paths?: readonly string[];
}) {
    // Preserve default typography, the 720px reading column, 224px outline, and 64px header.
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                header={
                    <PathBreadcrumb
                        className="min-w-0 overflow-hidden"
                        labels={articleRouteLabels}
                        root={<BreadcrumbItem href="/">Home</BreadcrumbItem>}
                    />
                }
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={<ArticleFooter lastUpdated={article.lastUpdated} editUrl={article.editUrl} paths={paths} />}
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                {children}
            </Article>
        </>
    );
}

/** Renders the Platform article's authored table of contents. */
export function ArticleOutline({ items }: { items: ComponentProps<typeof Outline>['items'] }) {
    // Keep the heading and navigation within the same labelled landmark.
    return (
        <Stack as="aside" aria-label="On this page" gap={3}>
            <Text type="label" weight="semibold">
                On this page
            </Text>
            <Outline items={items} density="compact" label="On this page" />
        </Stack>
    );
}

/** Renders article metadata and navigation through the collection selected by its caller. */
export function ArticleFooter({
    lastUpdated,
    editUrl,
    editLabel = 'Edit this page',
    paths = [],
}: {
    lastUpdated: string;
    editUrl?: string;
    editLabel?: string;
    paths?: readonly string[];
}) {
    // Resolve adjacent pages only within the caller's reading order.
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const pagePath = pathname.replace(/\/+$/, '') || '/';
    const currentPage = paths.indexOf(pagePath);
    const previousPage = paths[currentPage - 1];
    const nextPage = paths[currentPage + 1];

    /** Scrolls to the start of the newly selected article after navigation. */
    const scrollToArticleTop = () => {
        void requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    };

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

        // Match button navigation and reset the reading position.
        event.preventDefault();
        void navigate(`${destination}/`);
        scrollToArticleTop();
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
                <Stack aria-label="Article page navigation" direction="horizontal" hAlign="between" width="100%">
                    <Button
                        aria-keyshortcuts="ArrowLeft"
                        href={previousPage ? `${previousPage}/` : undefined}
                        icon={<ArrowLeft aria-hidden size={16} />}
                        isDisabled={previousPage === undefined}
                        label="Previous"
                        onClick={scrollToArticleTop}
                    />
                    <Button
                        aria-keyshortcuts="ArrowRight"
                        endContent={<ArrowRight aria-hidden size={16} />}
                        href={nextPage ? `${nextPage}/` : undefined}
                        isDisabled={nextPage === undefined}
                        label="Next"
                        onClick={scrollToArticleTop}
                    />
                </Stack>
            ) : null}
            <Divider />
            <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                <Text type="supporting">{`Last updated: ${dateFormatter.format(new Date(lastUpdated))}`}</Text>
                {editUrl ? (
                    <Link href={editUrl} hasUnderline isExternalLink type="supporting">
                        {editLabel}
                    </Link>
                ) : null}
            </Stack>
        </>
    );
}
