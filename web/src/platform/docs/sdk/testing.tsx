import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';

export const metadata = {
    toc: [
        { id: 'testing', label: 'Testing', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/testing.tsx',
};

export const content = (
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
            <Link href="https://pytest-asyncio.readthedocs.io/en/stable/" hasUnderline isExternalLink type="inherit">
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
);
