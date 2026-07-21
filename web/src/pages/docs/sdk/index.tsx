import { Monitor, Package } from 'lucide-react';
import { Card } from '@astryxdesign/core/Card';
import { Code } from '@astryxdesign/core/Code';
import { Grid } from '@astryxdesign/core/Grid';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeTabs } from '@/components/CodeTabs';
import { CodeBlock } from '@/components/CodeBlock';

/** Renders the local SDK runtime request flow diagram. */
function LocalRuntimeDiagram() {
    return (
        <Grid columns={{ minWidth: 190, max: 2, repeat: 'fit' }} gap={4}>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <Icon icon={Monitor} color="accent" />
                    <Text weight="semibold">User</Text>
                    <Text type="supporting">Browser</Text>
                    <Text type="supporting">Languages, theming, and application shell</Text>
                </Stack>
            </Card>
            <Card variant="muted">
                <Stack gap={2} align="center">
                    <Icon icon={Package} color="accent" />
                    <Text weight="semibold">Application</Text>
                    <Text type="supporting">Runtime at localhost:1707</Text>
                    <Text type="supporting">Application logic, database logic, and file storage</Text>
                </Stack>
            </Card>
        </Grid>
    );
}

export const metadata = {
    toc: [
        { id: 'create-a-project', label: 'Create a Project' },
        { id: 'local-development', label: 'Local Runtime' },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/index.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="application-sdk" level={1}>
            LongLink Applications / SDK
        </Heading>
        <Text as="p">
            The LongLink SDK is the runtime and tooling layer for LongLink Applications. It provides the application
            factory, route registration, database helpers, storage access, XML page discovery, page manifest endpoint,
            testing defaults, and image labels expected by the LongLink Platform.
        </Text>
        <Text as="p">
            Application code owns the process-specific behavior: models, validation, workflows, actions, API routes,
            integrations, and XML pages. The SDK provides the runtime contract that lets the LongLink Platform run the
            application consistently across local development, tests, and production.
        </Text>
        <Text as="p">
            The packaged container image is the handoff from the SDK to the LongLink Platform. Local development uses
            the SDK runtime and local services, while production receives platform-managed database, storage, routing,
            identity, and deployment configuration.
        </Text>
        <LocalRuntimeDiagram />
        <Heading id="create-a-project" level={2}>
            Create a Project
        </Heading>
        <Text as="p">Install LongLink:</Text>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'pip install longlink', label: 'pip', value: 'pip' },
                { code: 'uv add longlink', label: 'uv', value: 'uv' },
            ]}
        />
        <Text as="p">Create the application scaffold:</Text>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'longlink init', label: 'pip', value: 'pip' },
                { code: 'uv run longlink init', label: 'uv', value: 'uv' },
            ]}
        />
        <Text as="p">
            <Code>longlink init</Code> creates an application scaffold with separate directories for routes, schemas,
            database models and services, XML pages, translations, migrations, environment declarations, and tests:
        </Text>
        <CodeBlock language="text">
            {
                '├── src/\n│   ├── database/         # Database models and services\n│   ├── i18n/             # Translation catalogs\n│   ├── pages/            # XML page definitions\n│   ├── routes/           # FastAPI route modules\n│   ├── schemas/          # Pydantic request and response schemas\n│   └── envs.py           # Environment settings\n├── migrations/           # Alembic application migrations\n├── tests/                # Application tests\n├── main.py               # Application entry point\n├── pyproject.toml        # Project configuration\n├── .env.sample           # Environment template\n├── .gitignore\n├── AGENTS.md             # Application agent guide\n└── README.md'
            }
        </CodeBlock>
        <Heading id="local-development" level={2}>
            Local Runtime
        </Heading>
        <Text as="p">Install development dependencies:</Text>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'pip install .[dev]', label: 'pip', value: 'pip' },
                { code: 'uv sync --extra dev', label: 'uv', value: 'uv' },
            ]}
        />
        <Text as="p">
            Run the development server against <Code>main:app</Code> with the embedded SDK web bundle:
        </Text>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'longlink dev', label: 'pip', value: 'pip' },
                { code: 'uv run longlink dev', label: 'uv', value: 'uv' },
            ]}
        />
        <Text as="p">
            The development server listens on <Code>127.0.0.1</Code> by default. Use <Code>--host</Code> only when you
            intentionally need access from another host.
        </Text>
        <Text as="p">
            For a small working application, see the{' '}
            <Link href="https://github.com/xLongLink/sample" isExternalLink type="inherit">
                LongLink sample repository
            </Link>
            .
        </Text>
    </Stack>
);
