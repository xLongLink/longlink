import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Stack, StackItem } from '@astryxdesign/core/Stack';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Layout, LayoutContent, LayoutHeader, LayoutPanel } from '@astryxdesign/core/Layout';
import type { ArticlePage } from '@/pages/catalog';
import { formatDate } from '@/lib/utils';
import { PageContainer } from '@/components/PageContainer';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';

type ArticleContentProps = Pick<ArticlePage, 'content' | 'metadata'>;

const FALLBACK_UPDATED_AT = Date.now();

/** Renders shared documentation and legal article content. */
export function Article({ page }: { page: ArticlePage }) {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { memberships } = useUserOrganizations();
    const { content, metadata } = page;
    const pageToc = metadata.toc?.map((item) => ({ id: item.id, label: item.label, level: item.level ?? 2 })) ?? [];
    const getStartedHref =
        user && memberships.length === 1 ? `/orgs/${memberships[0].organization.slug}` : '/organizations';

    const breadcrumbs = (
        <Breadcrumbs className="min-w-0 overflow-hidden" separator=">" variant="supporting">
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
    const header = (
        <LayoutHeader className="sticky top-14 z-20 bg-card lg:top-2" padding={0}>
            <Stack direction="horizontal" height={64} width="100%">
                <StackItem className="min-w-0" size="fill">
                    <Stack height="100%" paddingInline={6} vAlign="center">
                        <PageContainer maxWidth={768}>{breadcrumbs}</PageContainer>
                    </Stack>
                </StackItem>
                <Center className="shrink-0 px-2 lg:w-56 lg:px-5" height={64}>
                    <Button href={getStartedHref} label={t('actions.getStarted')} size="sm" variant="primary" />
                </Center>
            </Stack>
            <Stack paddingInline={4}>
                <Divider />
            </Stack>
        </LayoutHeader>
    );

    return (
        <Layout
            height="auto"
            header={header}
            content={
                <LayoutContent isScrollable={false} padding={6}>
                    <PageContainer maxWidth={768}>
                        <ArticleContent content={content} metadata={metadata} />
                    </PageContainer>
                </LayoutContent>
            }
            end={
                <LayoutPanel
                    className="sticky top-20 hidden self-start lg:block"
                    isScrollable={false}
                    label={pageToc.length ? t('common.onThisPage') : undefined}
                    padding={5}
                    role={pageToc.length ? 'complementary' : undefined}
                    width={224}
                >
                    {pageToc.length ? (
                        <Stack gap={3}>
                            <Text type="label" weight="semibold">
                                {t('common.onThisPage')}
                            </Text>
                            <Outline items={pageToc} density="compact" label={t('common.onThisPage')} />
                        </Stack>
                    ) : null}
                </LayoutPanel>
            }
        />
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
