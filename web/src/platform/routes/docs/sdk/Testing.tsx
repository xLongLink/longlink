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
    description: 'Test LongLink projects and their Views.',
    toc: [
        { id: 'testing', label: 'Testing', level: 1 },
        { id: 'example', label: 'Example', level: 2 },
    ],
    lastUpdated: '2026-09-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Testing.tsx',
    title: 'Testing | LongLink Documentation',
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
                    <Heading id="testing" level={1}>
                        Testing
                    </Heading>
                    <Text as="p">
                        Test your application with standard{' '}
                        <Link href="https://docs.pytest.org/en/stable/" hasUnderline isExternalLink type="inherit">
                            pytest
                        </Link>{' '}
                        workflows. Use <Code>TestClient</Code> to run the application with isolated in-memory services,
                        without configuring a separate test environment.
                    </Text>
                    <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                        <Text weight="semibold">Why?</Text>
                        <Text as="p">
                            Tests stay fast, isolated, and reproducible while using the same application code as
                            development and production. The database and storage are created in memory for each test
                            run, so tests do not depend on external services or local setup.
                        </Text>
                    </Stack>
                    <CodeBlock code="uv run pytest <filename>" language="bash" />
                    <Heading id="example" level={2}>
                        Example
                    </Heading>
                    <CodeBlock
                        code={`from main import app
from longlink.testclient import TestClient


client = TestClient(app)


def test_healthcheck() -> None:
    """Return the LongLink runtime health payload."""
    response = client.get("/health")

    assert response.status_code == 200`}
                        language="python"
                    />
                </Stack>
            </Article>
        </>
    );
}
