import { CodeBlock } from '@/components/CodeBlock';
import { CodeTabs } from '@/components/CodeTabs';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
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
        <Heading id="application-sdk" level="h2">
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
        <P>Install LongLink:</P>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'pip install longlink', label: 'pip', value: 'pip' },
                { code: 'uv add longlink', label: 'uv', value: 'uv' },
            ]}
        />
        <P>Create the application scaffold:</P>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'longlink init', label: 'pip', value: 'pip' },
                { code: 'uv run longlink init', label: 'uv', value: 'uv' },
            ]}
        />
        <P>
            <Code>longlink init</Code> creates an application scaffold with separate locations for routes, schemas,
            database models and services, XML pages, translations, migrations, environment declarations, and tests:
        </P>
        <CodeBlock language="text">
            {
                '├── src/\n│   ├── database/         # Database models and services\n│   ├── i18n/             # Translation catalogs\n│   ├── pages/            # XML page definitions\n│   ├── routes/           # FastAPI route modules\n│   ├── schemas/          # Pydantic request and response schemas\n│   └── envs.py           # Environment settings\n├── migrations/           # Alembic application migrations\n├── tests/                # Application tests\n├── main.py               # Application entry point\n├── pyproject.toml        # Project configuration\n├── .env.sample           # Environment template\n├── .gitignore\n├── AGENTS.md             # Application agent guide\n└── README.md'
            }
        </CodeBlock>
        <Heading id="local-development" level="h2">
            Local Runtime
        </Heading>
        <P>Install development dependencies:</P>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'pip install .[dev]', label: 'pip', value: 'pip' },
                { code: 'uv sync --extra dev', label: 'uv', value: 'uv' },
            ]}
        />
        <P>
            Run the development server against <Code>main:app</Code> with the embedded SDK web bundle:
        </P>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'longlink dev', label: 'pip', value: 'pip' },
                { code: 'uv run longlink dev', label: 'uv', value: 'uv' },
            ]}
        />
        <P>
            For a small working application, see the{' '}
            <A href="https://github.com/xLongLink/sample">LongLink sample repository</A>.
        </P>
    </Stack>
);
