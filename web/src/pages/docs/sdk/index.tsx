import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="application-sdk" level="h1">
            Application SDK
        </Heading>
        <P>
            The Application SDK is the runtime and tooling layer for building LongLink applications as normal Python
            services. It provides the application factory, route registration, database helpers, storage access, XML
            page discovery, metadata endpoint, testing defaults, and image labels expected by the control plane.
        </P>
        <P>
            Process-specific behavior stays in application code. Developers define data models, validation, workflows,
            actions, API routes, integrations, and XML pages using the Python ecosystem; LongLink provides the runtime
            contract that lets the platform run the application consistently across local development, tests, and
            production.
        </P>
        <P>
            The packaged container image is the handoff from the SDK to the control plane. Local development uses the
            SDK runtime and local services, while production receives platform-managed database, storage, routing,
            identity, and deployment configuration.
        </P>
        <Heading id="create-a-project" level="h2">
            Create a Project
        </Heading>
        <Heading id="install" level="h3">
            Install
        </Heading>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">pip install longlink</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv add longlink</CodeBlock>
            </TabsContent>
        </Tabs>
        <Heading id="initialize-a-project" level="h3">
            Initialize a Project
        </Heading>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">longlink init</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv run longlink init</CodeBlock>
            </TabsContent>
        </Tabs>
        <Heading id="applications" level="h2">
            Application Structure
        </Heading>
        <P>
            <Code>longlink init</Code> creates a project scaffold with separate locations for API routes, data models,
            XML pages, typed schemas, environment declarations, and tests:
        </P>
        <CodeBlock language="text">
            {
                '├── src/\n│   ├── api/          # Route registration\n│   ├── models/       # Database models\n│   ├── pages/        # Page definitions\n│   ├── types/        # Data schemas\n│   └── envs.py       # Configuration\n├── tests/\n│   ├── api/          # API tests\n│   └── conftest.py   # Test setup\n├── main.py           # Entry point\n├── Dockerfile        # Container build definition\n├── pyproject.toml    # Project configuration\n├── .env.sample       # Environment template\n├── AGENTS.md         # Platform metadata\n└── README.md'
            }
        </CodeBlock>
        <Heading id="local-development" level="h2">
            Local Runtime
        </Heading>
        <P>Install development dependencies:</P>
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
        <P>
            Run the development server against <Code>main:app</Code> with the embedded SDK web bundle:
        </P>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">longlink dev</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv run longlink dev</CodeBlock>
            </TabsContent>
        </Tabs>
        <P>
            For a small working application, see the{' '}
            <A href="https://github.com/xLongLink/sample">LongLink sample repository</A>.
        </P>
    </Stack>
);
