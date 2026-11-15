import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

const article = {
    description: 'Test LongLink projects and their Views.',
    toc: [
        { id: 'testing', label: 'Testing', level: 1 },
        { id: 'example', label: 'Example', level: 2 }
    ],
    lastUpdated: '2026-09-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/testing.tsx',
    title: 'Testing | LongLink Documentation'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="testing">
                    Testing
                </h1>
                <p>
                    Test your application with standard{' '}
                    <Link href="https://docs.pytest.org/en/stable/" className="underline" isExternalLink>
                        pytest
                    </Link>{' '}
                    workflows. Use <InlineCode>TestClient</InlineCode> to run the application with isolated in-memory
                    services, without configuring a separate test environment.
                </p>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <span className="font-semibold">Why?</span>
                    <p>
                        Tests stay fast, isolated, and reproducible while using the same application code as development
                        and production. The database and storage are created in memory for each test run, so tests do
                        not depend on external services or local setup.
                    </p>
                </Stack>
                <CodeBlock code="uv run pytest <filename>" language="bash">
                    <CodeBlockCopyButton />
                </CodeBlock>
                <h2 className="font-semibold tracking-tight text-3xl" id="example">
                    Example
                </h2>
                <CodeBlock
                    code={`from main import app
from longlink.testclient import TestClient


client = TestClient(app)


def test_healthcheck() -> None:
    """Return the LongLink runtime health payload."""
    response = client.get("/health")

    assert response.status_code == 200`}
                    language="python"
                >
                    <CodeBlockCopyButton />
                </CodeBlock>
            </Stack>
        </DocumentationArticle>
    );
}

import { InlineCode } from '@/components/shadcn/inline-code';
