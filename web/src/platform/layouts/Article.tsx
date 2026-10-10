import type { ReactNode } from 'react';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { PageContainer } from '@/components/PageContainer';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';

type ArticleProps = {
    children: ReactNode;
    className?: string;
    header: ReactNode;
    footer: ReactNode;
    sidebar?: ReactNode;
};

/** Arranges article content and caller-owned header, footer, and sidebar elements. */
export function Article({ children, className, header, footer, sidebar }: ArticleProps) {
    // Preserve the 720px reading column, optional 224px sidebar, and 64px sticky header.
    return (
        <Layout
            height="auto"
            header={
                <LayoutHeader className="sticky top-14 z-20 bg-card lg:top-2" padding={0}>
                    <Stack>
                        <Stack className="relative" height={64} width="100%">
                            <PageContainer height="100%" justify="center" maxWidth={1064} paddingInline={6}>
                                <Stack direction="horizontal" gap={6} width="100%">
                                    <PageContainer className="min-w-0" maxWidth={720}>
                                        {header}
                                    </PageContainer>
                                    {sidebar ? <Stack className="hidden shrink-0 lg:flex" width={224} /> : null}
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
                            <article className={`article-content space-y-7${className ? ` ${className}` : ''}`}>
                                {children}
                                <Stack as="footer" gap={3} paddingBlockStart={8}>
                                    {footer}
                                </Stack>
                            </article>
                        </PageContainer>
                        {sidebar ? (
                            <Stack className="sticky top-20 hidden shrink-0 self-start lg:flex" padding={5} width={224}>
                                {sidebar}
                            </Stack>
                        ) : null}
                    </Stack>
                </LayoutContent>
            }
        />
    );
}
