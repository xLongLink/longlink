import type { ReactNode } from 'react';
import { useLocation } from 'react-router';
import { dateFormatter } from '@/lib/utils';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { componentDocumentation } from '@/lib/xsd';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Outline } from '@astryxdesign/core/Outline';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { PageContainer } from '@/components/PageContainer';
import { LegalBreadcrumb } from '@/components/breadcrumb/Legal';
import { DocumentationBreadcrumb } from '@/components/breadcrumb/Documentation';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';

type ArticlePage = {
    lastUpdated: string;
    toc?: Array<{ id: string; label: string; level: number }>;
    editUrl?: string;
};

const docsPages = [
    '/docs',
    '/docs/api',
    '/docs/api/organizations',
    '/docs/api/applications',
    '/docs/sdk',
    '/docs/sdk/environments',
    '/docs/sdk/routes',
    '/docs/sdk/storage',
    '/docs/sdk/database',
    '/docs/sdk/pages',
    '/docs/sdk/pages/bindings',
    '/docs/sdk/pages/expressions',
    ...componentDocumentation.map((component) => `/docs/sdk/pages/${component.slug}`),
    '/docs/sdk/testing',
    '/docs/sdk/building',
];

/** Renders shared documentation and legal article content. */
export function Article({ children, page }: { children: ReactNode; page: ArticlePage }) {
    const { pathname } = useLocation();
    const Breadcrumb = pathname.startsWith('/docs') ? DocumentationBreadcrumb : LegalBreadcrumb;
    const currentPage = docsPages.indexOf(pathname);
    const previousPage = docsPages[currentPage - 1];
    const nextPage = currentPage >= 0 ? docsPages[currentPage + 1] : undefined;

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
                            <Button href="/user/organizations" label="Get Started" size="sm" variant="primary" />
                        </Center>
                    </Stack>
                </LayoutHeader>
            }
            content={
                <LayoutContent isScrollable={false} padding={6}>
                    <Stack className="mx-auto" direction="horizontal" gap={6} maxWidth={1016} width="100%">
                        <PageContainer className="min-w-0" maxWidth={768}>
                            <article className="article-content space-y-7 text-justify">
                                {children}
                                <Stack as="footer" gap={3}>
                                    {currentPage >= 0 ? (
                                        <Stack
                                            aria-label="Documentation page navigation"
                                            direction="horizontal"
                                            hAlign="between"
                                            width="100%"
                                        >
                                            <Button
                                                href={previousPage}
                                                icon={<ArrowLeft aria-hidden size={16} />}
                                                isDisabled={previousPage === undefined}
                                                label="Previous"
                                            />
                                            <Button
                                                endContent={<ArrowRight aria-hidden size={16} />}
                                                href={nextPage}
                                                isDisabled={nextPage === undefined}
                                                label="Next"
                                            />
                                        </Stack>
                                    ) : null}
                                    <Divider />
                                    <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                                        <Text type="supporting" color="secondary">
                                            {`Last updated: ${dateFormatter.format(new Date(page.lastUpdated))}`}
                                        </Text>
                                        {page.editUrl ? (
                                            <Link href={page.editUrl} hasUnderline isExternalLink type="supporting">
                                                Edit this page in GitHub
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
    );
}
