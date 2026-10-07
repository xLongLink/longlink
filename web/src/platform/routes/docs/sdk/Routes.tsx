import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Button } from '@astryxdesign/core/Button';
import { documentationPaths } from '@/platform/docs';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Seo, articleRouteLabels } from '@/components/Seo';
import { PathBreadcrumb } from '@/components/breadcrumb/Path';
import { ArticleFooter, ArticleOutline } from '@/platform/components/Article';

const article = {
    description: 'Define API routes in a LongLink project.',
    toc: [
        { id: 'routes', label: 'Routes', level: 1 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-09-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Routes.tsx',
    title: 'Routes | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <>
            <Seo description={article.description} hasBreadcrumbs title={article.title} />
            <Article
                className="documentation-content [--font-family-heading:var(--font-family-handwritten)] [&_.astryx-heading]:uppercase [&_.astryx-heading]:tracking-wide"
                header={<PathBreadcrumb className="min-w-0 overflow-hidden" labels={articleRouteLabels} />}
                headerAction={<Button href="/login/" label="Get Started" size="sm" variant="primary" />}
                footer={
                    <ArticleFooter
                        lastUpdated={article.lastUpdated}
                        editUrl={article.editUrl}
                        paths={documentationPaths}
                    />
                }
                sidebar={article.toc.length ? <ArticleOutline items={article.toc} /> : undefined}
            >
                <Stack gap={5}>
                    <Heading id="routes" level={1}>
                        Routes
                    </Heading>
                    <Text as="p">
                        Implement your application logic using standard{' '}
                        <Link href="https://fastapi.tiangolo.com/tutorial/" hasUnderline isExternalLink type="inherit">
                            FastAPI routes
                        </Link>
                        . LongLink provides the current user and common services such as the database and storage
                        through <Code>Context</Code>, so you can use them directly without additional configuration.
                    </Text>
                    <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                        <Text weight="semibold">Why?</Text>
                        <Text as="p">
                            FastAPI is widely used, documented, and well represented in AI training data, making it
                            easier for AI models to understand, navigate, and modify the code. The logic is built as a
                            headless API, allowing the same endpoints to be accessed by the interface, external
                            applications, and AI agents.
                        </Text>
                    </Stack>
                    <Heading id="example" level={2}>
                        Example
                    </Heading>
                    <CodeBlock
                        code={`from longlink import Context, LongLink


app = LongLink()


@app.get("/api/me", response_model=str)
async def current_user_name(ctx: Context) -> str:
    """Return the current user's name."""

    # Read the user supplied by LongLink for this request.
    return ctx.user.name`}
                        language="python"
                        title="main.py"
                    />
                </Stack>
            </Article>
        </>
    );
}
