import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

const article = {
    description: 'The values behind the LongLink brand.',
    toc: [{ id: 'values', label: 'Values', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/branding/Values.tsx',
    title: 'Values | LongLink Branding',
};

/** Renders the values page while its content is being built. */
export default function Values() {
    // Reuse the article shell: 260px navigation, 720px prose, and 224px outline.
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                header={
                    <PathBreadcrumb
                        className="min-w-0 overflow-hidden"
                        labels={articleRouteLabels}
                        root={<BreadcrumbItem href="/">Home</BreadcrumbItem>}
                    />
                }
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={<ArticleFooter lastUpdated={article.lastUpdated} editUrl={article.editUrl} />}
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <Stack gap={4}>
                    <Heading id="values" level={1}>
                        Values
                    </Heading>
                    <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                        <Stack gap={0}>
                            <Text type="inherit">Beta notice: This page is being built.</Text>
                            <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                                Edit on GitHub
                            </Link>
                        </Stack>
                    </Blockquote>
                </Stack>
            </Article>
        </>
    );
}
