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
        { id: 'basic-usage', label: 'Basic usage', level: 2 },
        { id: 'timezone', label: 'Timezone', level: 2 },
        { id: 'users-table', label: 'Users table', level: 2 },
        { id: 'migrations', label: 'Migrations', level: 2 },
    ],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/docs/sdk/database.tsx',
};

export const content = (
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
            database session.
        </Text>
        <EnvironmentTable environments={environments} />
        <Text as="p">
            In production, the LongLink Platform provisions the organization database, shared user schema, and
            application schema, then injects the runtime connection settings into the application.
        </Text>
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
        <Text as="p">
            LongLink provides this type because SQLite in testing and development can return naive datetimes even for
            timezone-aware columns, while PostgreSQL production sessions use UTC. <Code>UTCDateTime</Code> rejects
            ambiguous values before storage, normalizes writes to UTC, and treats SQLite results as UTC so timestamps
            have the same meaning in every LongLink environment.
        </Text>
        <Heading id="audit-table" level={2}>
            Audit table
        </Heading>
        <Text as="p">
            Use <Code>database.AuditTable</Code> only when an Application table needs Platform-user attribution. It adds
            creation, update, and deletion timestamps; the matching Platform user identifiers; and read-only user
            relationships.
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
            After you add or change Application models, run{' '}
            <Link href="https://alembic.sqlalchemy.org/en/latest/" hasUnderline isExternalLink type="inherit">
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
            LongLink discovers Application models below <Code>src/database/models</Code> and migrates only
            Application-owned tables. The LongLink Platform separately manages shared tables such as <Code>audit</Code>.
        </Text>
    </Stack>
);
