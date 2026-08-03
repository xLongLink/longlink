import { Code } from '@astryxdesign/core/Code';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Heading } from '@astryxdesign/core/Heading';
import { Link } from '@astryxdesign/core/Link';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { CheckCheck, CheckCircle, Wrench } from 'lucide-react';
import { CodeTabs } from '@/components/CodeTabs';
import { EnvironmentTable, type EnvironmentRow } from '@/platform/docs/sdk/EnvironmentTable';

const environments: EnvironmentRow[] = [
    {
        name: 'Testing',
        icon: CheckCheck,
        backend: (
            <>
                <Code>memory</Code> SQLite database for isolated test runs.
            </>
        ),
    },
    {
        name: 'Development',
        icon: Wrench,
        backend: (
            <>
                <Code>dev.db</Code> SQLite database for local development.
            </>
        ),
    },
    {
        name: 'Production',
        icon: CheckCircle,
        backend: (
            <>
                <Code>PostgreSQL</Code> database scoped to the application schema.
            </>
        ),
    },
];

export const metadata = {
    toc: [
        { id: 'database', label: 'Database', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
        { id: 'timezone', label: 'Timezone', level: 2 },
        { id: 'migrations', label: 'Migrations', level: 2 },
        { id: 'users', label: 'Users', level: 2 },
    ],
    lastUpdated: '2026-08-03',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/database.tsx',
};

export const content = (
    <Stack gap={5}>
        <Heading id="database" level={1}>
            Database
        </Heading>
        <Text as="p">
            The SDK exposes a small database API for application-owned relational data. Use <Code>Table</Code> to define{' '}
            <Link href="https://sqlmodel.tiangolo.com/" isExternalLink type="inherit">
                SQLModel
            </Link>{' '}
            tables with LongLink audit fields, and use <Code>async with get_session()</Code> to open an async{' '}
            <Link href="https://www.sqlalchemy.org/" isExternalLink type="inherit">
                SQLAlchemy
            </Link>{' '}
            database session.
        </Text>
        <EnvironmentTable environments={environments} />
        <Text as="p">
            In production, the LongLink Platform provisions the organization database, shared user schema, and
            application schema, then injects the runtime connection settings into the application.
        </Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock
            code={`from longlink import Table, get_session
from sqlmodel import Field

class Project(Table, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str

async def create_project() -> None:
    async with get_session() as session:
        session.add(Project(name="Launch"))
        await session.commit()`}
            language="python"
        />
        <Heading id="timezone" level={2}>
            Timezone
        </Heading>
        <Text as="p">
            Use LongLink&apos;s <Code>UTCDateTime</Code> type for application-defined datetime fields. It requires a
            timezone-aware value and stores it in UTC.
        </Text>
        <CodeBlock
            code={`from datetime import UTC, datetime
from longlink import Table
from longlink.database.types import UTCDateTime
from sqlmodel import Field

class Event(Table, table=True):
    id: int | None = Field(default=None, primary_key=True)
    starts_at: datetime = Field(sa_type=UTCDateTime)

event = Event(starts_at=datetime(2026, 8, 3, 9, 0, tzinfo=UTC))`}
            language="python"
        />
        <Text as="p">
            LongLink provides this type because SQLite in testing and development can return naive datetimes even for
            timezone-aware columns, while PostgreSQL production sessions use UTC. <Code>UTCDateTime</Code> rejects
            ambiguous values before storage, normalizes writes to UTC, and treats SQLite results as UTC so timestamps
            have the same meaning in every LongLink environment.
        </Text>
        <Heading id="migrations" level={2}>
            Migrations
        </Heading>
        <Text as="p">
            After you add or change models, run{' '}
            <Link href="https://alembic.sqlalchemy.org/en/latest/" isExternalLink type="inherit">
                Alembic
            </Link>{' '}
            migrations to keep the database schema aligned:
        </Text>
        <CodeTabs
            items={[
                { code: 'longlink migrate', label: 'pip', value: 'pip' },
                { code: 'uv run longlink migrate', label: 'uv', value: 'uv' },
            ]}
        />
        <Text as="p">
            This manages only application-owned tables in the application schema. The LongLink Platform separately
            executes the SDK-owned migrations for shared tables such as <Code>users</Code>.
        </Text>
        <Heading id="users" level={2}>
            Users
        </Heading>
        <Text as="p">
            Users are managed by the LongLink platform and exposed by the SDK. Application code should not create,
            update, or authenticate users directly; use <Code>User</Code> as read-only display data when you need to
            show who created or changed a row.
        </Text>
        <Text as="p">
            Models that inherit from <Code>Table</Code> expose user relationships such as <Code>created_by</Code> and{' '}
            <Code>updated_by</Code>. Keep your own domain fields separate from platform user data.
        </Text>
        <CodeBlock
            code={`from longlink import User, get_session
from sqlmodel import select

async def list_project_creators() -> list[User | None]:
    async with get_session() as session:
        result = await session.exec(select(Project))
        return [project.created_by for project in result.all()]`}
            language="python"
        />
    </Stack>
);
