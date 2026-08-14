import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
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
    path: '/docs/sdk/database',
    title: 'Database',
    description: 'Use LongLink database helpers and migrations for application-owned data models.',
    toc: [
        { id: 'database', label: 'Database', level: 1 },
        { id: 'basic-usage', label: 'Basic usage', level: 2 },
        { id: 'timezone', label: 'Timezone', level: 2 },
        { id: 'migrations', label: 'Migrations', level: 2 },
    ],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/database.tsx',
};

export default function DatabaseDocumentation() {
    return (
        <Stack gap={5}>
            <Heading id="database" level={1}>
                Database
            </Heading>
            <Text as="p">
                Applications use standard{' '}
                <Link href="https://sqlmodel.tiangolo.com/" hasUnderline isExternalLink type="inherit">
                    SQLModel
                </Link>{' '}
                tables. The SDK adds <Code>database.session()</Code> for an Application-scoped async{' '}
                <Link href="https://www.sqlalchemy.org/" hasUnderline isExternalLink type="inherit">
                    SQLAlchemy
                </Link>{' '}
                database session. Migrations are based on{' '}
                <Link href="https://alembic.sqlalchemy.org/en/latest/" hasUnderline isExternalLink type="inherit">
                    Alembic
                </Link>
                .
            </Text>
            <EnvironmentTable environments={environments} />
            <Heading id="basic-usage" level={2}>
                Basic usage
            </Heading>
            <CodeBlock
                code={`from longlink import database
from sqlmodel import Field, SQLModel

class Project(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str

async def create_project() -> None:
    async with database.session() as session:
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
from longlink.database.types import UTCDateTime
from sqlmodel import Field, SQLModel

class Event(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    starts_at: datetime = Field(sa_type=UTCDateTime)

event = Event(starts_at=datetime(2026, 8, 3, 9, 0, tzinfo=UTC))`}
                language="python"
            />
            <Heading id="audit-table" level={2}>
                Audit table
            </Heading>
            <Text as="p">
                Use <Code>database.AuditTable</Code> only when an Application table needs Platform-user attribution. It
                adds creation, update, and deletion timestamps; the matching Platform user identifiers; and read-only
                user relationships.
            </Text>
            <CodeBlock
                code={`from longlink import database
from sqlmodel import Field

class Approval(database.AuditTable, table=True):
    id: int | None = Field(default=None, primary_key=True)
    status: str

approval = Approval(status="pending")
print(approval.status)  # pending

# approval.created_by and approval.updated_by are database.AuditUser values after persistence.`}
                language="python"
            />
            <Heading id="migrations" level={2}>
                Migrations
            </Heading>
            <Text as="p">
                After you add or change Application models, run migrations to keep the database schema aligned:
            </Text>
            <CodeTabs
                items={[
                    { code: 'longlink migrate', label: 'pip', value: 'pip' },
                    { code: 'uv run longlink migrate', label: 'uv', value: 'uv' },
                ]}
            />
        </Stack>
    );
}
