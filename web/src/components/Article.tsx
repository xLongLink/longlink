import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { useTranslator } from '@astryxdesign/core/i18n';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Outline } from '@astryxdesign/core/Outline';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { PageContainer } from '@/components/PageContainer';
import { useUserOrganizations, useUserProfile } from '@/hooks/use-user';
import { formatDate } from '@/lib/utils';
import type { ArticlePage } from '@/platform/catalog';

/** Renders shared documentation and legal article content. */
export function Article({ page }: { page: ArticlePage }) {
    const t = useTranslator();
    const { user } = useUserProfile();
    const { memberships } = useUserOrganizations();
    const { content, metadata } = page;
    const pageToc = metadata.toc ?? [];

    return (
        <Layout
            height="auto"
            header={
                <LayoutHeader className="sticky top-14 z-20 bg-card lg:top-2" hasDivider padding={0}>
                    <Stack className="relative" height={64} width="100%">
                        <PageContainer height="100%" justify="center" maxWidth={1064} paddingInline={6}>
                            <Breadcrumbs className="min-w-0 overflow-hidden" separator=">" variant="supporting">
                                {page.breadcrumbs.map((item, index) => {
                                    const isLast = index === page.breadcrumbs.length - 1;

                                    return (
                                        <BreadcrumbItem
                                            key={item.path}
                                            href={isLast ? undefined : item.path}
                                            isCurrent={isLast}
                                        >
                                            {item.title}
                                        </BreadcrumbItem>
                                    );
                                })}
                            </Breadcrumbs>
                        </PageContainer>
                        <Center className="absolute end-0 top-0 px-4" height={64}>
                            <Button
                                href={
                                    user && memberships.length === 1
                                        ? `/orgs/${memberships[0].organization.slug}`
                                        : '/organizations'
                                }
                                label={t('actions.getStarted')}
                                size="sm"
                                variant="primary"
                            />
                        </Center>
                    </Stack>
                </LayoutHeader>
            }
            content={
                <LayoutContent isScrollable={false} padding={6}>
                    <Stack className="mx-auto" direction="horizontal" gap={6} maxWidth={1016} width="100%">
                        <PageContainer className="min-w-0" maxWidth={768}>
                            <article className="article-content space-y-7 text-justify">
                                {content}
                                <Stack as="footer" gap={3}>
                                    <Divider />
                                    <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                                        <Text type="supporting" color="secondary">
                                            {t('common.lastUpdated', { date: formatDate(metadata.lastUpdated) })}
                                        </Text>
                                        {metadata.editUrl ? (
                                            <Link
                                                href={metadata.editUrl}
                                                hasUnderline
                                                target="_blank"
                                                type="supporting"
                                            >
                                                {t('docs.editInGithub')}
                                            </Link>
                                        ) : null}
                                    </Stack>
                                </Stack>
                            </article>
                        </PageContainer>
                        {pageToc.length ? (
                            <Stack
                                as="aside"
                                aria-label={t('common.onThisPage')}
                                className="sticky top-20 hidden shrink-0 self-start lg:flex"
                                gap={3}
                                padding={5}
                                width={224}
                            >
                                <Text type="label" weight="semibold">
                                    {t('common.onThisPage')}
                                </Text>
                                <Outline items={pageToc} density="compact" label={t('common.onThisPage')} />
                            </Stack>
                        ) : null}
                    </Stack>
                </LayoutContent>
            }
        />
    );
}
