import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AppWindow,
    ArrowLeftRight,
    Code2,
    Database,
    HardDrive,
    Languages,
    Palette,
    PanelTop,
    UserRound,
} from 'lucide-react';

/** Renders the local SDK runtime request flow diagram. */
function LocalRuntimeDiagram() {
    return (
        <div className="rounded-md border bg-muted/10 p-4">
            <div className="grid gap-4 lg:grid-cols-[13.5rem_7rem_13.5rem] lg:items-center lg:justify-center">
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <UserRound aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">User</div>
                        <div className="mt-1 text-sm text-muted-foreground">Browser</div>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1 text-muted-foreground">
                        <Languages aria-label="Languages" className="size-4" />
                        <Palette aria-label="Theming" className="size-4" />
                        <PanelTop aria-label="App shell" className="size-4" />
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <ArrowLeftRight aria-hidden={true} className="size-5" />
                    <div className="mt-1 text-xs tabular-nums">localhost:1707</div>
                </div>
                <div className="flex min-h-32 flex-col items-center justify-center gap-2 rounded-md border bg-muted/40 px-3 py-4 text-center">
                    <div className="flex size-9 items-center justify-center text-muted-foreground">
                        <AppWindow aria-hidden={true} className="size-5" />
                    </div>
                    <div>
                        <div className="font-medium text-foreground">Application</div>
                        <div className="mt-1 text-sm text-muted-foreground">Runtime</div>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1 text-muted-foreground">
                        <Code2 aria-label="Business logic" className="size-4" />
                        <Database aria-label="Database logic" className="size-4" />
                        <HardDrive aria-label="File storage" className="size-4" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-07-10',
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
        <LocalRuntimeDiagram />
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
