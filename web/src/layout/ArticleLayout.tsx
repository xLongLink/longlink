import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TopNav } from '@astryxdesign/core/TopNav';
import { useEffect, useRef, useState } from 'react';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { AppShell } from '@astryxdesign/core/AppShell';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import type { ArticleNavigationGroup, ArticlePage } from '@/pages/catalog';
import { formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { Sidebar } from '@/components/Sidebar';
import { useUserProfile } from '@/hooks/use-user';

type ArticleLayoutProps = {
    page: ArticlePage;
    navigationGroups: ArticleNavigationGroup[];
};

type ArticleContentProps = Pick<ArticlePage, 'content' | 'metadata'>;

type PageTocItem = {
    id: string;
    label: string;
    level: number;
};

/** Renders an article page using the shared article shell. */
export default function ArticleLayout({ page, navigationGroups }: ArticleLayoutProps) {
    const { t } = useTranslation();
    const { user, organizations } = useUserProfile();
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);
    const [pageToc, setPageToc] = useState<PageTocItem[]>([]);
    const { content, metadata } = page;
    const getStartedHref = user && organizations.length === 1 ? `/orgs/${organizations[0].slug}` : '/organizations';

    useEffect(() => {
        // Clear the table of contents until content is mounted.
        const contentElement = contentRef.current;
        if (!contentElement) {
            setPageToc([]);
            return;
        }

        // Wait for routed documentation content to commit before reading heading IDs.
        const frame = window.requestAnimationFrame(() => {
            const headings = Array.from(contentElement.querySelectorAll<HTMLHeadingElement>('h2[id]'))
                .map((heading) => ({
                    id: heading.id,
                    label: heading.textContent?.trim() ?? '',
                    level: 2,
                }))
                .filter((item) => item.id && item.label);

            setPageToc(headings);
        });

        return () => {
            window.cancelAnimationFrame(frame);
        };
    }, [location.pathname, content]);

    const breadcrumbs = (
        <Breadcrumbs variant="supporting">
            {page.breadcrumbs.map((item, index) => {
                const isLast = index === page.breadcrumbs.length - 1;

                return (
                    <BreadcrumbItem key={item.path} href={isLast ? undefined : item.path} isCurrent={isLast}>
                        {item.title}
                    </BreadcrumbItem>
                );
            })}
        </Breadcrumbs>
    );

    return (
        <AppShell
            contentPadding={2}
            height="auto"
            sideNav={<Sidebar currentPath={location.pathname} groups={navigationGroups} />}
            variant="wash"
        >
            <Card minHeight="calc(100dvh - var(--spacing-4))" width="100%">
                <Layout
                    height="auto"
                    header={
                        <LayoutHeader hasDivider padding={0}>
                            <TopNav
                                endContent={
                                    <Button
                                        href={getStartedHref}
                                        label={t('actions.getStarted')}
                                        size="sm"
                                        variant="primary"
                                    />
                                }
                                heading={breadcrumbs}
                                label="Documentation navigation"
                            />
                        </LayoutHeader>
                    }
                    content={
                        <LayoutContent isScrollable={false} padding={0}>
                            <div className="grid min-h-full w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_14rem]">
                                <div ref={contentRef} className="min-w-0 p-4 pb-12 lg:p-6 lg:pb-12">
                                    <div className="mx-auto w-full max-w-3xl">
                                        <ArticleContent content={content} metadata={metadata} />
                                    </div>
                                </div>

                                {pageToc.length ? (
                                    <aside
                                        className="sticky top-12 hidden max-h-[calc(100dvh-var(--spacing-12))] self-start overflow-auto border-s border-[var(--color-border)] px-5 py-6 lg:block"
                                        aria-label={t('common.onThisPage')}
                                    >
                                        <Stack gap={3}>
                                            <Text type="label" weight="semibold">
                                                {t('common.onThisPage')}
                                            </Text>
                                            <Outline items={pageToc} density="compact" label={t('common.onThisPage')} />
                                        </Stack>
                                    </aside>
                                ) : null}
                            </div>
                        </LayoutContent>
                    }
                />
            </Card>
        </AppShell>
    );
}

/** Renders article body content and optional source metadata. */
function ArticleContent({ content, metadata }: ArticleContentProps) {
    const { t } = useTranslation();
    const lastUpdated = metadata.lastUpdated
        ? (() => {
              const parsedDate = new Date(metadata.lastUpdated);

              return Number.isNaN(parsedDate.getTime()) ? metadata.lastUpdated : formatDate(parsedDate);
          })()
        : '';

    return (
        <article className="space-y-7 text-[1.0625rem] leading-8 text-[var(--color-text-secondary)] [&>div]:gap-5 [&_[data-slot=code-block]]:max-w-3xl [&_a]:font-medium [&_code]:text-[var(--color-text-primary)] [&_h1]:border-b [&_h1]:border-[var(--color-border)] [&_h1]:pb-3 [&_h1]:text-[1.75rem] [&_h1]:leading-tight [&_h1]:font-semibold [&_h1]:tracking-normal [&_h1]:text-[var(--color-text-primary)] [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-[var(--color-border)] [&_h2]:pb-3 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:tracking-normal [&_h2]:text-[var(--color-text-primary)] [&_h3]:mt-7 [&_h3]:border-b [&_h3]:border-[var(--color-border)] [&_h3]:pb-2 [&_h3]:text-[1.35rem] [&_h3]:leading-snug [&_h3]:tracking-normal [&_h3]:text-[var(--color-text-primary)] [&_h4]:mt-5 [&_h4]:border-b [&_h4]:border-[var(--color-border)] [&_h4]:pb-2 [&_h4]:text-xl [&_h4]:tracking-normal [&_h4]:text-[var(--color-text-primary)] [&_li]:leading-7 [&_p]:max-w-3xl [&_p]:leading-7">
            {content}
            {metadata.lastUpdated || metadata.editUrl ? (
                <Stack as="footer" gap={3}>
                    <Divider />
                    <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                        {metadata.lastUpdated ? (
                            <Text type="supporting" color="secondary">
                                {t('common.lastUpdated', { date: lastUpdated })}
                            </Text>
                        ) : (
                            <span />
                        )}
                        {metadata.editUrl ? (
                            <Link as="a" href={metadata.editUrl} isExternalLink type="supporting">
                                {t('docs.editInGithub')}
                            </Link>
                        ) : null}
                    </Stack>
                </Stack>
            ) : null}
        </article>
    );
}
