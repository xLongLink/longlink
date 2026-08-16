import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Article } from '@/components/layouts/Article';

export const metadata = {
    path: '/docs/sdk/testing',
    title: 'Testing',
    description: 'Test LongLink applications with isolated runtime configuration and Python testing workflows.',
    toc: [
        { id: 'testing', label: 'Testing', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Testing.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="testing" level={1}>
                    Testing
                </Heading>
                <Text as="p">
                    Test LongLink applications with standard{' '}
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
                <CodeBlock
                    code={`uv run pytest
uv run pytest tests/test_app.py -q`}
                    language="bash"
                />
                <Heading id="usage" level={2}>
                    Usage
                </Heading>
                <CodeBlock
                    code={`from main import app
from fastapi.testclient import TestClient

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
