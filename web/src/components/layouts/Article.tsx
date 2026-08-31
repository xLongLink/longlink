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
import { useLocation, useNavigate } from 'react-router';
import { PageContainer } from '@/components/PageContainer';
import { LegalBreadcrumb } from '@/components/breadcrumb/Legal';
import { useEffect, useEffectEvent, type ReactNode } from 'react';
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
    const navigate = useNavigate();
    const Breadcrumb = pathname.startsWith('/docs') ? DocumentationBreadcrumb : LegalBreadcrumb;
    const currentPage = docsPages.indexOf(pathname);
    const previousPage = docsPages[currentPage - 1];
    const nextPage = currentPage >= 0 ? docsPages[currentPage + 1] : undefined;

    const scrollToArticleTop = () => {
        requestAnimationFrame(() => {
            window.scrollTo({ top: 0 });
        });
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
        navigate(destination);
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
        <Layout
            height="auto"
            header={
                <LayoutHeader className="sticky top-14 z-20 bg-card lg:top-2" hasDivider padding={0}>
                    <Stack className="relative" height={64} width="100%">
                        <PageContainer height="100%" justify="center" maxWidth={1064} paddingInline={6}>
                            <Breadcrumb className="min-w-0 overflow-hidden" />
                        </PageContainer>
                        <Center className="absolute end-0 top-0" height={64} paddingInline={4}>
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
                                                aria-keyshortcuts="ArrowLeft"
                                                href={previousPage}
                                                icon={<ArrowLeft aria-hidden size={16} />}
                                                isDisabled={previousPage === undefined}
                                                label="Previous"
                                                onClick={scrollToArticleTop}
                                            />
                                            <Button
                                                aria-keyshortcuts="ArrowRight"
                                                endContent={<ArrowRight aria-hidden size={16} />}
                                                href={nextPage}
                                                isDisabled={nextPage === undefined}
                                                label="Next"
                                                onClick={scrollToArticleTop}
                                            />
                                        </Stack>
                                    ) : null}
                                    <Divider />
                                    <Stack direction="horizontal" gap={3} hAlign="between" vAlign="center" wrap="wrap">
                                        <Text type="supporting">
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
