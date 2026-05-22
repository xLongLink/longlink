import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';

/** Renders the SDK testing page. */
export default function SdkTestingPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Testing</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Applications built with the LongLink SDK can be tested using standard{' '}
                    <A href="https://docs.pytest.org/en/stable/" target="_blank" rel="noopener noreferrer">
                        pytest
                    </A>{' '}
                    and{' '}
                    <A href="https://pytest-asyncio.readthedocs.io/en/stable/" target="_blank" rel="noopener noreferrer">
                        pytest-asyncio
                    </A>{' '}
                    workflows. When a project is generated, these tools are already included as development
                    dependencies in the pyproject.toml file.
                </P>
                <P className="max-w-3xl text-muted-foreground">To install the development dependencies, run:</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"[uv]\nuv add .[dev]"}</code>
                </pre>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"[pip]\npip install .[dev]"}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="usage" level="h2" className="text-foreground">Usage</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    You can execute all tests or target a specific test file using the following commands. Use{' '}
                    <Code>sdk/tests</Code> for SDK test files and keep file paths aligned with the repository layout:
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"pytest\npytest sdk/tests/cli/test_init.py"}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="example" level="h2" className="text-foreground">Example</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Illustrative snippet: asynchronous testing with <Code>pytest</Code>
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"import pytest\n\n\n@pytest.mark.asyncio\nasync def test_healthcheck(client):\n    response = await client.get('/health')\n\n    assert response.status_code == 200"}</code>
                </pre>
                <P className="max-w-3xl text-muted-foreground">
                    Illustrative snippet: testing with FastAPI{' '}
                    <A href="https://fastapi.tiangolo.com/tutorial/testing/" target="_blank" rel="noopener noreferrer">
                        TestClient
                    </A>
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"from app import app\nfrom fastapi.testclient import TestClient\n\nclient = TestClient(app)\n\n\ndef test_healthcheck():\n    response = client.get(\"/health\")\n\n    assert response.status_code == 200\n    assert response.json() == {\"status\": \"ok\"}"}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="resources" level="h2" className="text-foreground">Resources</Heading>
                <A href="https://fastapi.tiangolo.com/tutorial/testing/" target="_blank" rel="noopener noreferrer">FastAPI TestClient</A>
                <A href="https://docs.pytest.org/" target="_blank" rel="noopener noreferrer">pytest Documentation</A>
                <A href="https://github.com/pytest-dev/pytest" target="_blank" rel="noopener noreferrer">pytest GitHub</A>
                <A href="https://pytest-asyncio.readthedocs.io/en/stable/" target="_blank" rel="noopener noreferrer">pytest-asyncio Documentation</A>
                <A href="https://github.com/pytest-dev/pytest-asyncio" target="_blank" rel="noopener noreferrer">pytest-asyncio Github</A>
            </section>
        </article>
    );
}
