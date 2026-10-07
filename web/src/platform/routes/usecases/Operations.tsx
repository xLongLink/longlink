import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { useCasePaths } from '@/platform/usecases';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { Blockquote } from '@astryxdesign/core/Blockquote';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

const article = {
    description: 'Build operational applications that coordinate recurring work, handoffs, and exceptions.',
    toc: [{ id: 'operations', label: 'Operations', level: 1 }],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/usecases/Operations.tsx',
    title: 'Operations | LongLink Use Cases',
};

/** Explains how Solutions can coordinate day-to-day operational work. */
export default function Operations() {
    // Reuse the existing article shell: 260px navigation, 720px prose, and 224px outline.
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                className="documentation-content [--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:uppercase"
                header={<PathBreadcrumb className="min-w-0 overflow-hidden" labels={articleRouteLabels} />}
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={
                    <ArticleFooter lastUpdated={article.lastUpdated} editUrl={article.editUrl} paths={useCasePaths} />
                }
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <Stack gap={4}>
                    <Heading id="operations" level={1} textWrap="balance">
                        Operations
                    </Heading>
                    <Blockquote className="border-s-(--color-text-orange) text-(--color-text-orange)">
                        <Stack gap={0}>
                            <Text type="inherit">Beta notice: This page is being built.</Text>
                            <Link color="inherit" href={article.editUrl} hasUnderline isExternalLink type="inherit">
                                Edit on GitHub
                            </Link>
                        </Stack>
                    </Blockquote>
                    <Text as="p" textWrap="pretty">
                        Every company develops its own way of working. Over time, daily operations accumulate specific
                        rules, responsibilities, exceptions, and connections between systems. Generic software can
                        support parts of this work, but often cannot represent the whole process without adding
                        complexity.
                    </Text>
                    <Text as="p" textWrap="pretty">
                        Dedicated software can follow the operation as it actually works, keeping its data, states,
                        actions, and rules together.
                    </Text>
                    <Text as="p" textWrap="pretty">
                        Operational knowledge becomes a Solution that can evolve with the organization.
                    </Text>
                    <Card className="handwritten-diagram relative overflow-hidden" padding={0} variant="transparent">
                        <img
                            alt="An operational cycle connects tasks, people, data, and exceptions around a central process."
                            className="aspect-video w-full scale-90 object-contain"
                            decoding="async"
                            height={1086}
                            loading="lazy"
                            src="/images/operations.png"
                            width={1448}
                        />
                    </Card>
                </Stack>
            </Article>
        </>
    );
}
