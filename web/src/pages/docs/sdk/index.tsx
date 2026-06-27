import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/index.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="application-sdk" level="h1">
            Application SDK
        </Heading>
        <p className="leading-7">
            The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem. It does
            not introduce a new framework or replace existing tools. Instead, it provides a structured way to compose
            and connect them within the LongLink platform.
        </p>
        <p className="leading-7">Applications follow a simple model:</p>
        <ul className="ml-6 list-disc space-y-2">
            <li>Business logic lives in the application code</li>
            <li>Structured data is stored in a relational database</li>
            <li>Unstructured data is stored in S3-compatible object storage</li>
        </ul>
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
        <p className="leading-7">
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink init</code>{' '}
            creates a minimal application scaffold that{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">longlink dev</code>{' '}
            can run immediately:
        </p>
        <CodeBlock language="text">
            {
                '├── src/\n│   ├── api/          # Route registration\n│   ├── models/       # Database models\n│   ├── pages/        # Page definitions\n│   ├── types/        # Data schemas\n│   └── envs.py       # Configuration\n├── tests/\n│   ├── api/          # API tests\n│   └── conftest.py   # Test setup\n├── main.py           # Entry point\n├── Dockerfile        # Container build definition\n├── pyproject.toml    # Project configuration\n├── .env.sample       # Environment template\n├── AGENTS.md         # Platform metadata\n└── README.md'
            }
        </CodeBlock>
        <Heading id="local-development" level="h2">
            Local Development
        </Heading>
        <p className="leading-7">Install development dependencies:</p>
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
        <p className="leading-7">Run the development server against the scaffolded app:</p>
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
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <A href="https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend">
                    Official FastAPI Backend Template
                </A>
            </li>
        </ul>
    </div>
);
