import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeTabs } from '@/components/CodeTabs';
import { CodeBlock } from '@/components/CodeBlock';

export const metadata = {
    toc: [
        { id: 'usage', label: 'Usage' },
        { id: 'example', label: 'Example' },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/testing.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="testing" level={1}>
            Testing
        </Heading>
        <Text as="p">
            Test LongLink applications with standard{' '}
            <Link href="https://docs.pytest.org/en/stable/" isExternalLink type="inherit">
                pytest
            </Link>{' '}
            and{' '}
            <Link href="https://pytest-asyncio.readthedocs.io/en/stable/" isExternalLink type="inherit">
                pytest-asyncio
            </Link>{' '}
            workflows. Generated projects also include the dependencies needed by{' '}
            <Code>longlink.testing.TestClient</Code>.
        </Text>
        <Text as="p">To install the development dependencies, run:</Text>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'pip install .[dev]', label: 'pip', value: 'pip' },
                { code: 'uv sync --extra dev', label: 'uv', value: 'uv' },
            ]}
        />
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <Text as="p">
            You can execute all tests or target a specific test file using the LongLink test command. Arguments after{' '}
            <Code>longlink test</Code> are forwarded to <Code>pytest</Code>.
        </Text>
        <CodeBlock language="bash">{`uv run longlink test
uv run longlink test tests/test_app.py -q`}</CodeBlock>
        <Heading id="example" level={2}>
            Example
        </Heading>
        <Text as="p">
            LongLink applications are FastAPI applications, and <Code>longlink.testing.TestClient</Code> is a compatible
            facade over FastAPI's{' '}
            <Link href="https://fastapi.tiangolo.com/tutorial/testing/" isExternalLink type="inherit">
                TestClient
            </Link>
            . Use async pytest tests for lower-level async services when needed.
        </Text>
        <CodeBlock language="python">{`from main import app
from longlink.testing import TestClient

client = TestClient(app)

def test_healthcheck() -> None:
    """Return the LongLink runtime health payload."""
    response = client.get("/health")

    assert response.status_code == 200`}</CodeBlock>
    </Stack>
);
