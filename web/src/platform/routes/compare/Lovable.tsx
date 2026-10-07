import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { comparisonPaths } from '@/platform/usecases';
import { Article } from '@/components/layouts/Article';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

const article = {
    description: 'LongLink vs Lovable. This comparison page is being built.',
    toc: [{ id: 'longlink-vs-lovable', label: 'LongLink vs Lovable', level: 1 }],
    lastUpdated: '2026-10-06',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/compare/Lovable.tsx',
    title: 'LongLink vs Lovable | LongLink Compare',
};

/** Renders the placeholder for the Lovable comparison. */
export default function Lovable() {
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                className="documentation-content [--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:uppercase"
                header={<PathBreadcrumb className="min-w-0 overflow-hidden" labels={articleRouteLabels} />}
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={
                    <ArticleFooter
                        lastUpdated={article.lastUpdated}
                        editUrl={article.editUrl}
                        paths={comparisonPaths}
                    />
                }
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <Stack gap={4}>
                    <Heading id="longlink-vs-lovable" level={1} textWrap="balance">
                        LongLink vs Lovable
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
