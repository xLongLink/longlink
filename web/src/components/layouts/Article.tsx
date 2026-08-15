import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import type { ArticlePage } from '@/lib/articles';
import { dateFormatter } from '@/lib/utils';
import { PageContainer } from '@/components/PageContainer';
import { LegalBreadcrumb } from '@/components/breadcrumb/Legal';
import { DocumentationBreadcrumb } from '@/components/breadcrumb/Documentation';

/** Renders shared documentation and legal article content. */
export function Article({ page }: { page: ArticlePage }) {
    const { content, metadata } = page;
    const Breadcrumb = page.path.startsWith('/docs') ? DocumentationBreadcrumb : LegalBreadcrumb;

    return (
        <Layout
            height="auto"
            header={
                <LayoutHeader className="sticky top-14 z-20 bg-card lg:top-2" hasDivider padding={0}>
                    <Stack className="relative" height={64} width="100%">
                        <PageContainer height="100%" justify="center" maxWidth={1064} paddingInline={6}>
                            <Breadcrumb className="min-w-0 overflow-hidden" />
                        </PageContainer>
                        <Center className="absolute end-0 top-0 px-4" height={64}>
                            <Button href="/organizations" label="Get Started" size="sm" variant="primary" />
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
                                            {`Last updated: ${dateFormatter.format(new Date(metadata.lastUpdated))}`}
                                        </Text>
                                        {metadata.editUrl ? (
                                            <Link href={metadata.editUrl} hasUnderline isExternalLink type="supporting">
                                                Edit this page in GitHub
                                            </Link>
                                        ) : null}
                                    </Stack>
                                </Stack>
                            </article>
                        </PageContainer>
                        {metadata.toc?.length ? (
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
                                <Outline items={metadata.toc} density="compact" label="On this page" />
                            </Stack>
                        ) : null}
                    </Stack>
                </LayoutContent>
            }
        />
    );
}
