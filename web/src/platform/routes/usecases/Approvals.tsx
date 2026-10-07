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
    description: 'Build approval and decision workflows around your organization’s rules, responsibilities, and data.',
    toc: [{ id: 'approvals-and-decisions', label: 'Approvals & decisions', level: 1 }],
    lastUpdated: '2026-10-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/usecases/Approvals.tsx',
    title: 'Approvals & decisions | LongLink Use Cases',
};

/** Explains how Solutions can organize requests and business decisions. */
export default function Approvals() {
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
                    <Heading id="approvals-and-decisions" level={1} textWrap="balance">
                        Approvals & decisions
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
                        Many processes depend on a decision. A request is made, information is collected, rules are
                        checked, and someone decides what happens next. When these steps are spread across emails,
                        documents, and different systems, even simple decisions can take unnecessary time.
                    </Text>
                    <Text as="p" textWrap="pretty">
                        Dedicated software can bring the request, its context, the rules, and the decision into one
                        place.
                    </Text>
                    <Text as="p" textWrap="pretty">
                        These processes become Solutions where automated checks and human decisions are clearly
                        separated and expressed as code.
                    </Text>
                    <Card className="handwritten-diagram relative overflow-hidden" padding={0} variant="transparent">
                        <img
                            alt="A request moves through automated checks to a human decision, leading to approval or rejection."
                            className="aspect-video w-full object-contain"
                            decoding="async"
                            height={1086}
                            loading="lazy"
                            src="/images/approvals-and-decisions.png"
                            width={1448}
                        />
                    </Card>
                </Stack>
            </Article>
        </>
    );
}
