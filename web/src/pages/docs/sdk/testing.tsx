import { CodeBlock } from '@/components/CodeBlock';
import { CodeTabs } from '@/components/CodeTabs';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/testing.tsx',
};

export const content = (
    <Stack>
        <Heading id="testing" level="h1">
            Testing
        </Heading>
        <P>
            Test LongLink applications with standard <A href="https://docs.pytest.org/en/stable/">pytest</A> and{' '}
            <A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio</A> workflows. Generated projects
            also include the dependencies needed by <Code>longlink.testing.TestClient</Code>.
        </P>
        <P>To install the development dependencies, run:</P>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'pip install .[dev]', label: 'pip', value: 'pip' },
                { code: 'uv sync --extra dev', label: 'uv', value: 'uv' },
            ]}
        />
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <P>
            You can execute all tests or target a specific test file using the LongLink test command. Arguments after{' '}
            <Code>longlink test</Code> are forwarded to <Code>pytest</Code>.
        </P>
        <CodeBlock language="bash">{`uv run longlink test
uv run longlink test tests/test_app.py -q`}</CodeBlock>
        <Heading id="example" level="h2">
            Example
        </Heading>
        <P>
            LongLink apps are FastAPI apps, and <Code>longlink.testing.TestClient</Code> is a compatible facade over{' '}
            FastAPI's <A href="https://fastapi.tiangolo.com/tutorial/testing/">TestClient</A>. Use async pytest tests
            for lower-level async services when needed.
        </P>
        <CodeBlock language="python">{`from main import app
from longlink.testing import TestClient

client = TestClient(app)

def test_healthcheck() -> None:
    """Return the LongLink runtime health payload."""
    response = client.get("/health")

    assert response.status_code == 200`}</CodeBlock>
    </Stack>
);
