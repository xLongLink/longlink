import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { CheckCheck, CheckCircle, Wrench } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

export const metadata = {
    toc: [
        { id: 'database', label: 'Database', level: 1 },
        { id: 'basic-usage', label: 'Basic usage', level: 2 },
        { id: 'timezone', label: 'Timezone', level: 2 },
        { id: 'migrations', label: 'Migrations', level: 2 },
    ],
    lastUpdated: '2026-08-05',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Database.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHeaderCell>Environment</TableHeaderCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell>
                                <Stack gap={1}>
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <CheckCheck aria-hidden="true" className="text-accent" size={16} />
                                        <Text weight="semibold">Testing</Text>
                                    </Stack>
                                    <Text type="supporting">
                                        <Code>memory</Code> SQLite database for isolated test runs.
                                    </Text>
                                </Stack>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Stack gap={1}>
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <Wrench aria-hidden="true" className="text-accent" size={16} />
                                        <Text weight="semibold">Development</Text>
                                    </Stack>
                                    <Text type="supporting">
                                        <Code>dev.db</Code> SQLite database for local development.
                                    </Text>
                                </Stack>
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell>
                                <Stack gap={1}>
                                    <Stack direction="horizontal" gap={2} align="center">
                                        <CheckCircle aria-hidden="true" className="text-accent" size={16} />
                                        <Text weight="semibold">Production</Text>
                                    </Stack>
                                    <Text type="supporting">
                                        <Code>PostgreSQL</Code> database scoped to the application schema.
                                    </Text>
                                </Stack>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
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
                    Use LongLink&apos;s <Code>UTCDateTime</Code> type for application-defined datetime fields. It
                    requires a timezone-aware value and stores it in UTC.
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
                    Use <Code>database.AuditTable</Code> only when an Application table needs Platform-user attribution.
                    It adds creation, update, and deletion timestamps; the matching Platform user identifiers; and
                    read-only user relationships.
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
                <CodeBlock code="uv run longlink migrate" language="bash" />
            </Stack>
        </Article>
    );
}
