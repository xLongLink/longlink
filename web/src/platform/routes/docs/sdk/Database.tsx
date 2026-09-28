import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const article = {
    description: 'Use database services in a LongLink project.',
    toc: [
        { id: 'database', label: 'Database', level: 1 },
        { id: 'basic-usage', label: 'Basic usage', level: 2 },
        { id: 'timezone', label: 'Timezone', level: 2 },
        { id: 'migrations', label: 'Migrations', level: 2 },
    ],
    lastUpdated: '2026-09-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Database.tsx',
    title: 'Database | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="database" level={1}>
                    Database
                </Heading>
                <Text as="p">
                    Define your data with standard{' '}
                    <Link href="https://sqlmodel.tiangolo.com/" hasUnderline isExternalLink type="inherit">
                        SQLModel
                    </Link>{' '}
                    models. The database session and connection are already available through <Code>ctx.database</Code>,
                    so you can work directly with your data without additional setup.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        The interface stays the same in every environment: an in-memory SQLite database for isolated
                        tests, a local dev.db file during development, and a solution-scoped schema in the
                        organization&apos;s database when deployed on the LongLink platform.
                    </Text>
                </Stack>
                <Heading id="basic-usage" level={2}>
                    Basic usage
                </Heading>
                <CodeBlock
                    code={`from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from longlink import Context


class Project(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str


async def create_project(ctx: Context) -> None:
    ctx.database.add(Project(name="Launch"))
    await ctx.database.commit()`}
                    language="python"
                />
                <Heading id="timezone" level={2}>
                    Timezone
                </Heading>
                <Text as="p">
                    SQLModel stores <Code>datetime</Code> fields in UTC. Use timezone-aware values when writing or
                    querying them.
                </Text>
                <CodeBlock
                    code={`from datetime import UTC, datetime
from sqlmodel import Field, SQLModel


class Event(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    starts_at: datetime


event = Event(starts_at=datetime(2026, 8, 3, 9, 0, tzinfo=UTC))`}
                    language="python"
                />
                <Heading id="audit-table" level={2}>
                    Audit table
                </Heading>
                <Text as="p">
                    Use <Code>AuditTable</Code> only when a database table needs Platform-user attribution. It adds
                    creation, update, and deletion timestamps; the matching Platform user identifiers; and read-only
                    user relationships.
                </Text>
                <CodeBlock
                    code={`from sqlmodel import Field
from longlink.database.base import AuditTable


class Approval(AuditTable, table=True):
    id: int | None = Field(default=None, primary_key=True)
    status: str


approval = Approval(status="pending")
print(approval.status)  # pending

# approval.created_by and approval.updated_by are Audit users after persistence.`}
                    language="python"
                />
                <Heading id="migrations" level={2}>
                    Migrations
                </Heading>
                <Text as="p">After you add or change database models, run migrations to keep the schema aligned:</Text>
                <CodeBlock code="uv run longlink migrate" language="bash" />
            </Stack>
        </Article>
    );
}
