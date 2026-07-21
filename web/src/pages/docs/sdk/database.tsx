import type { IconName } from '@astryxdesign/core/Icon';
import { Code } from '@astryxdesign/core/Code';
import { Icon } from '@astryxdesign/core/Icon';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';
import { CodeTabs } from '@/components/CodeTabs';
import { CodeBlock } from '@/components/CodeBlock';

const environments: { backend: React.ReactNode; icon: IconName; name: string }[] = [
    {
        name: 'Testing',
        icon: 'checkDouble',
        backend: (
            <>
                <Code>memory</Code> SQLite database for isolated test runs.
            </>
        ),
    },
    {
        name: 'Development',
        icon: 'wrench',
        backend: (
            <>
                <Code>dev.db</Code> SQLite database for local development.
            </>
        ),
    },
    {
        name: 'Production',
        icon: 'success',
        backend: (
            <>
                <Code>PostgreSQL</Code> database scoped to the application schema.
            </>
        ),
    },
];

export const metadata = {
    toc: [
        { id: 'usage', label: 'Usage' },
        { id: 'migrations', label: 'Migrations' },
        { id: 'users', label: 'Users' },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/database.tsx',
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
        <Table<Record<string, unknown>>>
            <TableHeader>
                <TableRow>
                    <TableHeaderCell>Environment</TableHeaderCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {environments.map((environment) => (
                    <TableRow key={environment.name}>
                        <TableCell>
                            <Stack gap={1}>
                                <Stack direction="horizontal" gap={2} align="center">
                                    <Icon icon={environment.icon} size="sm" color="accent" />
                                    <Text weight="semibold">{environment.name}</Text>
                                </Stack>
                                <Text type="supporting">{environment.backend}</Text>
                            </Stack>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        <Text as="p">
            In production, the LongLink Platform provisions the organization database, shared user schema, and
            application schema, then injects the runtime connection settings into the application.
        </Text>
        <Heading id="usage" level={2}>
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import Table, get_session
from sqlmodel import Field

class Project(Table, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str

async def create_project() -> None:
    async with get_session() as session:
        session.add(Project(name="Launch"))
        await session.commit()`}</CodeBlock>
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
            defaultValue="pip"
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
        <CodeBlock language="python">{`from longlink import User, get_session
from sqlmodel import select

async def list_project_creators() -> list[User | None]:
    async with get_session() as session:
        result = await session.exec(select(Project))
        return [project.created_by for project in result.all()]`}</CodeBlock>
    </Stack>
);
