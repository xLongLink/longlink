import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/testing.tsx',
};

export const content = (
    <Stack>
        <Heading id="testing" level="h1">
            Testing
        </Heading>
        <P>
            Applications built with the LongLink SDK can be tested using standard{' '}
            <A href="https://docs.pytest.org/en/stable/">pytest</A> and{' '}
            <A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio</A> workflows. When a project is
            generated, these tools are already included as development dependencies in the <Code>pyproject.toml</Code>{' '}
            file.
        </P>
        <P>To install the development dependencies, run:</P>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">pip install .[dev]</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv sync --extra dev</CodeBlock>
            </TabsContent>
        </Tabs>
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
            Illustrative snippet: asynchronous testing with <Code>pytest</Code>
        </P>
        <CodeBlock language="python">{`import pytest


@pytest.mark.asyncio
async def test_healthcheck(client):
    response = await client.get('/health')

    assert response.status_code == 200`}</CodeBlock>
        <P>
            Illustrative snippet: testing with FastAPI{' '}
            <A href="https://fastapi.tiangolo.com/tutorial/testing/">TestClient</A>
        </P>
        <CodeBlock language="python">{`from app import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_healthcheck():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}`}</CodeBlock>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <Ul>
            <Li>
                <A href="https://fastapi.tiangolo.com/tutorial/testing/">FastAPI TestClient</A>
            </Li>
            <Li>
                <A href="https://docs.pytest.org/">pytest Documentation</A>
            </Li>
            <Li>
                <A href="https://github.com/pytest-dev/pytest">pytest GitHub</A>
            </Li>
            <Li>
                <A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio Documentation</A>
            </Li>
            <Li>
                <A href="https://github.com/pytest-dev/pytest-asyncio">pytest-asyncio GitHub</A>
            </Li>
        </Ul>
    </Stack>
);
