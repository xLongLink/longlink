import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Card } from '@astryxdesign/core/Card';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { AppShell } from '@astryxdesign/core/AppShell';
import { useTranslator } from '@astryxdesign/core/i18n';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import type { ArticleNavigationGroup, ArticlePage } from '@/pages/catalog';
import { formatDate } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';

type ArticleLayoutProps = {
    page: ArticlePage;
    navigationGroups: ArticleNavigationGroup[];
};

type ArticleContentProps = Pick<ArticlePage, 'content' | 'metadata'>;

const DOCS_SIDEBAR_WIDTH = 260;
const FALLBACK_UPDATED_AT = Date.now();

/** Renders an article page using the shared article shell. */
export default function ArticleLayout({ page, navigationGroups }: ArticleLayoutProps) {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { organizations } = useUserOrganizations();
    const isMobile = useIsMobile();
    const location = useLocation();
    const { content, metadata } = page;
    const pageToc = metadata.toc?.map((item) => ({ id: item.id, label: item.label, level: item.level ?? 2 })) ?? [];
    const getStartedHref = user && organizations.length === 1 ? `/orgs/${organizations[0].slug}` : '/organizations';

    const breadcrumbs = (
        <Breadcrumbs separator=">" variant="supporting">
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

    const sidebar = <Sidebar currentPath={location.pathname} groups={navigationGroups} />;
    const header = (
        <LayoutHeader padding={0}>
            <div className="relative grid h-16 grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="min-w-0 px-4 lg:px-6">
                    <div className="mx-auto flex h-full w-full max-w-3xl items-center">{breadcrumbs}</div>
                </div>
                <div className="flex items-center justify-end pe-2 lg:px-5">
                    <Button href={getStartedHref} label={t('actions.getStarted')} size="sm" variant="primary" />
                </div>
                <div aria-hidden="true" className="absolute inset-x-2 bottom-0 border-b border-border" />
            </div>
        </LayoutHeader>
    );
    const body = (
        <div className="grid min-h-full w-full grid-cols-1 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <div className="min-w-0 p-4 pt-7 pb-12 lg:p-6 lg:pt-10 lg:pb-12">
                <div className="mx-auto w-full max-w-3xl">
                    <ArticleContent content={content} metadata={metadata} />
                </div>
            </div>

            {pageToc.length ? (
                <aside
                    className="fixed end-2 top-16 bottom-2 z-20 hidden w-56 overflow-auto px-5 py-6 lg:block"
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
    );

    return (
        <div style={{ paddingInlineStart: isMobile ? 0 : DOCS_SIDEBAR_WIDTH }}>
            {!isMobile ? (
                <div className="fixed inset-y-0 start-0 z-30 bg-body" style={{ width: DOCS_SIDEBAR_WIDTH }}>
                    {sidebar}
                </div>
            ) : null}

            <AppShell contentPadding={2} height="auto" sideNav={isMobile ? sidebar : undefined} variant="wash">
                {isMobile ? (
                    <Card minHeight="calc(100dvh - var(--spacing-4))" width="100%">
                        <Layout
                            height="auto"
                            header={header}
                            content={
                                <LayoutContent isScrollable={false} padding={0}>
                                    {body}
                                </LayoutContent>
                            }
                        />
                    </Card>
                ) : (
                    <div className="relative min-h-[calc(100dvh-var(--spacing-4))]">
                        <Card
                            style={{
                                position: 'fixed',
                                insetBlock: 'var(--spacing-2)',
                                insetInlineStart: `calc(${DOCS_SIDEBAR_WIDTH}px + var(--spacing-2))`,
                                insetInlineEnd: 'var(--spacing-2)',
                                border: 'none',
                                pointerEvents: 'none',
                                zIndex: 0,
                            }}
                        />
                        <div
                            style={{
                                position: 'fixed',
                                insetBlockStart: 'var(--spacing-2)',
                                insetInlineStart: `calc(${DOCS_SIDEBAR_WIDTH}px + var(--spacing-2))`,
                                insetInlineEnd: 'var(--spacing-2)',
                                backgroundColor: 'var(--color-background-card)',
                                borderStartStartRadius: 'var(--radius-container)',
                                borderStartEndRadius: 'var(--radius-container)',
                                overflow: 'hidden',
                                zIndex: 20,
                            }}
                        >
                            {header}
                        </div>
                        <div
                            aria-hidden="true"
                            className="pointer-events-none fixed inset-y-0 end-0 z-[25] border-8 border-body"
                            style={{ insetInlineStart: DOCS_SIDEBAR_WIDTH }}
                        />
                        <div className="relative z-10 pt-12">{body}</div>
                    </div>
                )}
            </AppShell>
        </div>
    );
}

/** Renders article body content and source metadata. */
function ArticleContent({ content, metadata }: ArticleContentProps) {
    const t = useTranslator();
    const lastUpdatedDate = new Date(metadata.lastUpdated ?? FALLBACK_UPDATED_AT);
    const lastUpdated = formatDate(Number.isNaN(lastUpdatedDate.getTime()) ? FALLBACK_UPDATED_AT : lastUpdatedDate);

    return (
        <article className="docs-article space-y-7 text-[1.0625rem] leading-8 text-secondary [&_a]:font-medium [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-3 [&_h1]:text-[1.75rem] [&_h1]:leading-tight [&_h1]:tracking-normal [&_h2]:mt-10 [&_h2]:border-b [&_h2]:border-border [&_h2]:pb-3 [&_h2]:text-[1.75rem] [&_h2]:leading-tight [&_h2]:tracking-normal [&_h3]:mt-7 [&_h3]:border-b [&_h3]:border-border [&_h3]:pb-2 [&_h3]:text-[1.35rem] [&_h3]:leading-snug [&_h3]:tracking-normal [&_h4]:mt-5 [&_h4]:border-b [&_h4]:border-border [&_h4]:pb-2 [&_h4]:text-xl [&_h4]:tracking-normal [&_li]:leading-7 [&_p]:leading-7">
            {content}
            <Stack as="footer" gap={3}>
                <Divider />
                <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                    <Text type="supporting" color="secondary">
                        {t('common.lastUpdated', { date: lastUpdated })}
                    </Text>
                    {metadata.editUrl ? (
                        <Link as="a" href={metadata.editUrl} isExternalLink type="supporting">
                            {t('docs.editInGithub')}
                        </Link>
                    ) : null}
                </Stack>
            </Stack>
        </article>
    );
}
