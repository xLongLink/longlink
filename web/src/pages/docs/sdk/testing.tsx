import { A } from '@/components/ui/a';
import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/testing.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="testing" level="h1">
            Testing
        </Heading>
        <p className="leading-7">
            Applications built with the LongLink SDK can be tested using standard{' '}
            <A href="https://docs.pytest.org/en/stable/">pytest</A> and{' '}
            <A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio</A> workflows. When a project
            is generated, these tools are already included as development dependencies in the{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">pyproject.toml</code>{' '}
            file.
        </p>
        <p className="leading-7">To install the development dependencies, run:</p>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">pip install .[dev]</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv add .[dev]</CodeBlock>
            </TabsContent>
        </Tabs>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <p className="leading-7">
            You can execute all tests or target a specific test file using the following commands. Use{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">sdk/tests</code> for
            SDK test files and keep file paths aligned with the repository layout:
        </p>
        <CodeBlock language="bash">pytest
pytest sdk/tests/cli/test_init.py</CodeBlock>
        <Heading id="example" level="h2">
            Example
        </Heading>
        <p className="leading-7">Illustrative snippet: asynchronous testing with <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">pytest</code></p>
        <CodeBlock language="python">{`import pytest


@pytest.mark.asyncio
async def test_healthcheck(client):
    response = await client.get('/health')

    assert response.status_code == 200`}</CodeBlock>
        <p className="leading-7">
            Illustrative snippet: testing with FastAPI{' '}
            <A href="https://fastapi.tiangolo.com/tutorial/testing/">TestClient</A>
        </p>
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
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <A href="https://fastapi.tiangolo.com/tutorial/testing/">FastAPI TestClient</A>
            </li>
            <li>
                <A href="https://docs.pytest.org/">pytest Documentation</A>
            </li>
            <li>
                <A href="https://github.com/pytest-dev/pytest">pytest GitHub</A>
            </li>
            <li>
                <A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio Documentation</A>
            </li>
            <li>
                <A href="https://github.com/pytest-dev/pytest-asyncio">pytest-asyncio GitHub</A>
            </li>
        </ul>
    </div>
);
