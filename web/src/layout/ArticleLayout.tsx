import { useLocation } from 'react-router';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { TopNav } from '@astryxdesign/core/TopNav';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { AppShell } from '@astryxdesign/core/AppShell';
import { useTranslator } from '@astryxdesign/core/i18n';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Layout, LayoutContent, LayoutPanel } from '@astryxdesign/core/Layout';
import type { ArticleNavigationGroup, ArticlePage } from '@/pages/catalog';
import { formatDate } from '@/lib/utils';
import { Sidebar } from '@/components/Sidebar';
import { Wordmark } from '@/components/Wordmark';
import { PageContainer } from '@/components/PageContainer';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';

type ArticleLayoutProps = {
    page: ArticlePage;
    navigationGroups: ArticleNavigationGroup[];
};

type ArticleContentProps = Pick<ArticlePage, 'content' | 'metadata'>;

const FALLBACK_UPDATED_AT = Date.now();

/** Renders an article page using the shared article shell. */
export default function ArticleLayout({ page, navigationGroups }: ArticleLayoutProps) {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { organizations } = useUserOrganizations();
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
    const topNav = (
        <TopNav
            endContent={<Button href={getStartedHref} label={t('actions.getStarted')} size="sm" variant="primary" />}
            heading={
                <Link href="/" label={t('common.longlinkHome')} color="inherit">
                    <Wordmark />
                </Link>
            }
            label={t('common.mainNavigation')}
        />
    );

    return (
        <AppShell
            contentPadding={0}
            height="auto"
            mobileNav={{ breakpoint: 'lg' }}
            sideNav={sidebar}
            topNav={topNav}
            variant="elevated"
        >
            <Layout
                height="auto"
                content={
                    <LayoutContent isScrollable={false} padding={6}>
                        <PageContainer gap={6} maxWidth={768}>
                            {breadcrumbs}
                            <ArticleContent content={content} metadata={metadata} />
                        </PageContainer>
                    </LayoutContent>
                }
                end={
                    pageToc.length ? (
                        <LayoutPanel
                            className="sticky top-12 hidden self-start lg:block"
                            isScrollable={false}
                            label={t('common.onThisPage')}
                            padding={5}
                            role="complementary"
                            width={224}
                        >
                            <Stack gap={3}>
                                <Text type="label" weight="semibold">
                                    {t('common.onThisPage')}
                                </Text>
                                <Outline items={pageToc} density="compact" label={t('common.onThisPage')} />
                            </Stack>
                        </LayoutPanel>
                    ) : undefined
                }
            />
        </AppShell>
    );
}

/** Renders article body content and source metadata. */
function ArticleContent({ content, metadata }: ArticleContentProps) {
    const t = useTranslator();
    const lastUpdatedDate = new Date(metadata.lastUpdated ?? FALLBACK_UPDATED_AT);
    const lastUpdated = formatDate(Number.isNaN(lastUpdatedDate.getTime()) ? FALLBACK_UPDATED_AT : lastUpdatedDate);

    return (
        <Stack as="article" gap={8}>
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
        </Stack>
    );
}
