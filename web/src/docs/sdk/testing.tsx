import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/testing.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Testing</H1>
    <P>Applications built with the LongLink SDK can be tested using standard <A href="https://docs.pytest.org/en/stable/">pytest</A> and <A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio</A> workflows. When a project is generated, these tools are already included as development dependencies in the <Code>pyproject.toml</Code> file.</P>
    <P>To install the development dependencies, run:</P>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">pip install .[dev]</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv add .[dev]</Pre>
      </Tab>
    </Tabs>
    <H2>Usage</H2>
    <P>You can execute all tests or target a specific test file using the following commands. Use <Code>sdk/tests</Code> for SDK test files and keep file paths aligned with the repository layout:</P>
    <Pre lang="bash">pytest
pytest sdk/tests/cli/test_init.py</Pre>
    <H2>Example</H2>
    <P>Illustrative snippet: asynchronous testing with <Code>pytest</Code></P>
    <Pre lang="python">import pytest


@pytest.mark.asyncio
async def test_healthcheck(client):
    response = await client.get('/health')

    assert response.status_code == 200</Pre>
    <P>Illustrative snippet: testing with FastAPI <A href="https://fastapi.tiangolo.com/tutorial/testing/">TestClient</A></P>
    <Pre lang="python">from app import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_healthcheck():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}</Pre>
    <H2>Resources</H2>
    <Ul>
      <Li><A href="https://fastapi.tiangolo.com/tutorial/testing/">FastAPI TestClient</A></Li>
      <Li><A href="https://docs.pytest.org/">pytest Documentation</A></Li>
      <Li><A href="https://github.com/pytest-dev/pytest">pytest GitHub</A></Li>
      <Li><A href="https://pytest-asyncio.readthedocs.io/en/stable/">pytest-asyncio Documentation</A></Li>
      <Li><A href="https://github.com/pytest-dev/pytest-asyncio">pytest-asyncio GitHub</A></Li>
    </Ul>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;
