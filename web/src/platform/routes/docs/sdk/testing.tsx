import { DocumentationArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { NativeCodeBlock as CodeBlock } from '@/components/custom/native-code-block';

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
                <Heading id="testing" level={1}>
                    Testing
                </Heading>
                <Text as="p">
                    Test your application with standard{' '}
                    <Link href="https://docs.pytest.org/en/stable/" hasUnderline isExternalLink type="inherit">
                        pytest
                    </Link>{' '}
                    workflows. Use <InlineCode>TestClient</InlineCode> to run the application with isolated in-memory
                    services, without configuring a separate test environment.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        Tests stay fast, isolated, and reproducible while using the same application code as development
                        and production. The database and storage are created in memory for each test run, so tests do
                        not depend on external services or local setup.
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
        </DocumentationArticle>
    );
}

import { InlineCode } from '@/components/shadcn/inline-code';
