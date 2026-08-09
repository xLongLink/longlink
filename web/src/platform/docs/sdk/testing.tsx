import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { CodeTabs } from '@/components/CodeTabs';

export const metadata = {
    toc: [
        { id: 'testing', label: 'Testing', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'example', label: 'Example', level: 2 },
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
            workflows. Generated projects also include the dependencies needed by FastAPI's <Code>TestClient</Code>.
        </Text>
        <Text as="p">To install the development dependencies, run:</Text>
        <CodeTabs
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
        <CodeBlock
            code={`uv run longlink test
uv run longlink test tests/test_app.py -q`}
            language="bash"
        />
        <Heading id="example" level={2}>
            Example
        </Heading>
        <Text as="p">
            LongLink applications are FastAPI applications and can use FastAPI's{' '}
            <Link href="https://fastapi.tiangolo.com/tutorial/testing/" hasUnderline isExternalLink type="inherit">
                TestClient
            </Link>
            . Use async pytest tests for lower-level async services when needed.
        </Text>
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
