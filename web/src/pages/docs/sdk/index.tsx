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
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/index.tsx',
};

export const content = (
    <Stack>
        <Heading id="application-sdk" level="h1">
            Application SDK
        </Heading>
        <P>
            The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem. It does
            not introduce a new framework or replace existing tools. Instead, it provides a structured way to compose
            and connect them within the LongLink platform.
        </P>
        <P>Applications follow a simple model:</P>
        <Ul>
            <Li>Business logic lives in the application code</Li>
            <Li>Structured data is stored in a relational database</Li>
            <Li>Unstructured data is stored in S3-compatible object storage</Li>
        </Ul>
        <Heading id="getting-started" level="h2">
            Getting Started
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
            Applications
        </Heading>
        <P>
            <Code>longlink init</Code> creates a minimal application scaffold that <Code>longlink dev</Code> can run
            immediately:
        </P>
        <CodeBlock language="text">
            {
                '├── src/\n│   ├── api/          # Route registration\n│   ├── models/       # Database models\n│   ├── pages/        # Page definitions\n│   ├── types/        # Data schemas\n│   └── envs.py       # Configuration\n├── tests/\n│   ├── api/          # API tests\n│   └── conftest.py   # Test setup\n├── main.py           # Entry point\n├── Dockerfile        # Container build definition\n├── pyproject.toml    # Project configuration\n├── .env.sample       # Environment template\n├── AGENTS.md         # Platform metadata\n└── README.md'
            }
        </CodeBlock>
        <Heading id="local-development" level="h2">
            Local Development
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
        <P>Run the development server against the scaffolded app:</P>
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
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <Ul>
            <Li>
                <A href="https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend">
                    Official FastAPI Backend Template
                </A>
            </Li>
        </Ul>
    </Stack>
);
