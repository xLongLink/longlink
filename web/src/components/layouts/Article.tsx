import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { documentationPaths } from '@/platform/docs';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
import { PageContainer } from '@/components/PageContainer';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';

type ArticlePage = {
    description: string;
    lastUpdated: string;
    toc?: Array<{ id: string; label: string; level: number }>;
    editUrl?: string;
    title: string;
};

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
});

const legalPaths = ['/terms', '/impressum', '/privacy'];
const useCasePaths = [
    '/use-cases',
    '/use-cases/approvals-and-decisions',
    '/use-cases/operations',
    '/use-cases/compliance-and-quality',
    '/use-cases/cases-and-projects',
];
const comparisonPaths = [
    '/compare/longlink-vs-retool',
    '/compare/longlink-vs-lovable',
    '/compare/longlink-vs-windmill',
    '/compare/longlink-vs-microsoft-power-apps',
    '/compare/longlink-vs-replit',
    '/compare/longlink-vs-appsmith',
    '/compare/longlink-vs-superblocks',
    '/compare/longlink-vs-fastapi',
    '/compare/longlink-vs-reflex',
];

/** Renders shared documentation, use-case, comparison, and legal article content. */
export function Article({ children, page }: { children: ReactNode; page: ArticlePage }) {
    const { pathname } = useLocation();
    const navigate = useNavigate();
    const pagePath = pathname.replace(/\/+$/, '') || '/';
    const isGuide =
        pagePath.startsWith('/docs') ||
        pagePath === '/use-cases' ||
        pagePath.startsWith('/use-cases/') ||
        pagePath.startsWith('/compare/');

    // Keep each article collection within its own reading order.
    const navigationPaths = legalPaths.includes(pagePath)
        ? legalPaths
        : useCasePaths.includes(pagePath)
          ? useCasePaths
          : comparisonPaths.includes(pagePath)
            ? comparisonPaths
            : documentationPaths;
    const currentPage = navigationPaths.indexOf(pagePath);
    const previousPage = navigationPaths[currentPage - 1];
    const nextPage = navigationPaths[currentPage + 1];

    const scrollToArticleTop = () => {
        void requestAnimationFrame(() => window.scrollTo({ top: 0 }));
    };

    const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
        if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
            return;
        }

        // Leave text-entry controls available for their native cursor behavior.
        if (
            event.target instanceof HTMLElement &&
            event.target.closest('input, textarea, select, [contenteditable="true"]')
        ) {
            return;
        }

        const destination =
            event.key === 'ArrowLeft' ? previousPage : event.key === 'ArrowRight' ? nextPage : undefined;

        if (destination === undefined) {
            return;
        }

        event.preventDefault();
        void navigate(`${destination}/`);
        scrollToArticleTop();
    });

    useEffect(() => {
        if (currentPage < 0) {
            return;
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [currentPage]);

    return (
        <>
            <Seo description={page.description} hasBreadcrumbs title={page.title} />
            <Layout
                height="auto"
                header={
                    <LayoutHeader className="sticky top-14 z-20 bg-card lg:top-2" padding={0}>
                        <Stack>
                            <Stack className="relative" height={64} width="100%">
                                <PageContainer height="100%" justify="center" maxWidth={1064} paddingInline={6}>
                                    <Stack direction="horizontal" gap={6} width="100%">
                                        <PageContainer className="min-w-0" maxWidth={720}>
                                            <PathBreadcrumb
                                                className="min-w-0 overflow-hidden"
                                                labels={articleRouteLabels}
                                                root={
                                                    isGuide ? undefined : <BreadcrumbItem href="/">Home</BreadcrumbItem>
                                                }
                                            />
                                        </PageContainer>
                                        {page.toc?.length ? (
                                            <Stack className="hidden shrink-0 lg:flex" width={224} />
                                        ) : null}
                                    </Stack>
                                </PageContainer>
                                <Center className="absolute end-0 top-0" height={64} paddingInline={4}>
                                    <Button href="/login/" label="Get Started" size="sm" variant="primary" />
                                </Center>
                            </Stack>
                            <Stack paddingInline={5}>
                                <Divider />
                            </Stack>
                        </Stack>
                    </LayoutHeader>
                }
                content={
                    <LayoutContent isScrollable={false} padding={6}>
                        <Stack className="mx-auto" direction="horizontal" gap={6} maxWidth={1016} width="100%">
                            <PageContainer className="min-w-0" maxWidth={720}>
                                <article
                                    className={`article-content space-y-7${isGuide ? ' documentation-content [--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:uppercase' : ''}${pagePath.startsWith('/docs') ? ' [&_.astryx-heading]:tracking-wide' : ''}`}
                                >
                                    {children}
                                    <Stack as="footer" gap={3}>
                                        {currentPage >= 0 ? (
                                            <Stack
                                                aria-label="Article page navigation"
                                                direction="horizontal"
                                                hAlign="between"
                                                paddingBlockStart={8}
                                                width="100%"
                                            >
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
                                        <Stack
                                            direction="horizontal"
                                            gap={3}
                                            hAlign="between"
                                            vAlign="center"
                                            wrap="wrap"
                                        >
                                            <Text type="supporting">
                                                {`Last updated: ${dateFormatter.format(new Date(page.lastUpdated))}`}
                                            </Text>
                                            {page.editUrl ? (
                                                <Link href={page.editUrl} hasUnderline isExternalLink type="supporting">
                                                    Edit this page
                                                </Link>
                                            ) : null}
                                        </Stack>
                                    </Stack>
                                </article>
                            </PageContainer>
                            {page.toc?.length ? (
                                <Stack
                                    as="aside"
                                    aria-label="On this page"
                                    className="sticky top-20 hidden shrink-0 self-start lg:flex"
                                    gap={3}
                                    padding={5}
                                    width={224}
                                >
                                    <Text type="label" weight="semibold">
                                        On this page
                                    </Text>
                                    <Outline items={page.toc} density="compact" label="On this page" />
                                </Stack>
                            ) : null}
                        </Stack>
                    </LayoutContent>
                }
            />
        </>
    );
}
