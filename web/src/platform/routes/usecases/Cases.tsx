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
    description: 'Build case and project applications that keep context, responsibilities, and progress together.',
    toc: [{ id: 'cases-and-projects', label: 'Cases & projects', level: 1 }],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/usecases/Cases.tsx',
    title: 'Cases & projects | LongLink Use Cases',
};

/** Explains how Solutions can organize work around individual cases and projects. */
export default function Cases() {
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
                    <Heading id="cases-and-projects" level={1} textWrap="balance">
                        Cases & projects
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
                        Some work exists for a specific purpose and a limited period of time. A customer engagement,
                        construction project, investigation, implementation, or case can have its own people, data,
                        rules, decisions, and milestones.
                    </Text>
                    <Text as="p" textWrap="pretty">
                        Instead of adapting a permanent company system to every situation, dedicated software can follow
                        the lifecycle of the work itself.
                    </Text>
                    <Text as="p" textWrap="pretty">
                        Each case or project can become a Solution built around exactly what is needed, from its
                        beginning to its completion.
                    </Text>
                    <Card className="handwritten-diagram relative overflow-hidden" padding={0} variant="transparent">
                        <img
                            alt="A case or project follows a path through tasks, collaboration, reviews, and completion."
                            className="aspect-video w-full object-contain"
                            decoding="async"
                            height={1086}
                            loading="lazy"
                            src="/images/cases-and-projects.png"
                            width={1448}
                        />
                    </Card>
                </Stack>
            </Article>
        </>
    );
}
