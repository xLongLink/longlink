import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const article = {
    description: 'Test LongLink projects and their Views.',
    toc: [
        { id: 'testing', label: 'Testing', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Testing.tsx',
    title: 'Testing | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="testing" level={1}>
                    Testing
                </Heading>
                <Text as="p">
                    Test your project with standard{' '}
                    <Link href="https://docs.pytest.org/en/stable/" hasUnderline isExternalLink type="inherit">
                        pytest
                    </Link>{' '}
                    and{' '}
                    <Link
                        href="https://pytest-asyncio.readthedocs.io/en/stable/"
                        hasUnderline
                        isExternalLink
                        type="inherit"
                    >
                        pytest-asyncio
                    </Link>{' '}
                    workflows.
                </Text>
                <Text as="p">
                    Import <Code>TestClient</Code> from <Code>longlink.testclient</Code> instead of{' '}
                    <Code>fastapi.testclient</Code>. The import selects the testing environment with isolated in-memory
                    services, so no environment setup is needed. Keep the client import above the application import so
                    the environment applies when the app is created.
                </Text>
                <CodeBlock
                    code={`uv run pytest
uv run pytest tests/test_app.py -q`}
                    language="bash"
                />
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={`from longlink.testclient import TestClient
from main import app

client = TestClient(app)

def test_healthcheck() -> None:
    """Return the LongLink runtime health payload."""
    response = client.get("/health")

    assert response.status_code == 200`}
                    language="python"
                />
            </Stack>
        </Article>
    );
}
