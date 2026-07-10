import { CodeBlock } from '@/components/CodeBlock';
import { CodeTabs } from '@/components/CodeTabs';
import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Cloud, FlaskConical, Laptop } from 'lucide-react';

const environmentIcons = {
    Development: Laptop,
    Production: Cloud,
    Testing: FlaskConical,
} as const;

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/database.tsx',
};

export const content = (
    <Stack>
        <Heading id="database" level="h1">
            Database
        </Heading>
        <P>
            The SDK exposes a small database API for application-owned relational data. Use <Code>db.Table</Code> to
            define <A href="https://sqlmodel.tiangolo.com/">SQLModel</A> tables with LongLink audit fields, and use{' '}
            <Code>async with db.get_session()</Code> to open an async <A href="https://www.sqlalchemy.org/">SQLAlchemy</A>{' '}
            database session.
        </P>
        <div className="overflow-hidden rounded-md border">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="bg-muted/50">Environment</TableHead>
                        <TableHead className="bg-muted/50">Database backend</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <environmentIcons.Testing aria-hidden={true} className="size-4" />
                                </div>
                                <Code>Testing</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            <Code>memory</Code> SQLite database for isolated test runs.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <environmentIcons.Development aria-hidden={true} className="size-4" />
                                </div>
                                <Code>Development</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            <Code>dev.db</Code> SQLite database for local development.
                        </TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell>
                            <div className="flex items-center gap-3">
                                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-accent/10 text-accent [&_svg]:size-4 [&_svg]:stroke-[2.5]">
                                    <environmentIcons.Production aria-hidden={true} className="size-4" />
                                </div>
                                <Code>Production</Code>
                            </div>
                        </TableCell>
                        <TableCell className="whitespace-normal text-muted-foreground">
                            <Code>PostgreSQL</Code> database scoped to the application schema.
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>
        </div>
        <P>
            In production, the control plane provisions the organization database, shared user schema, and application
            schema, then injects the runtime connection settings into the application.
        </P>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import db
from sqlmodel import Field

class Project(db.Table, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str

async def create_project() -> None:
    async with db.get_session() as session:
        session.add(Project(name="Launch"))
        await session.commit()`}</CodeBlock>
        <Heading id="migrations" level="h2">
            Migrations
        </Heading>
        <P>
            After you add or change models, run <A href="https://alembic.sqlalchemy.org/en/latest/">Alembic</A>{' '}
            migrations to keep the database schema aligned:
        </P>
        <CodeTabs
            defaultValue="pip"
            items={[
                { code: 'longlink migrate', label: 'pip', value: 'pip' },
                { code: 'uv run longlink migrate', label: 'uv', value: 'uv' },
            ]}
        />
        <P>This keeps schema changes synchronized with application code.</P>
        <Heading id="users" level="h2">
            Users
        </Heading>
        <P>
            Users are managed by the LongLink platform and exposed by the SDK. Application code should not create,
            update, or authenticate users directly; use <Code>User</Code> as read-only display data when you need to show
            who created or changed a row.
        </P>
        <P>
            Models that inherit from <Code>db.Table</Code> expose user relationships such as <Code>created_by</Code> and{' '}
            <Code>updated_by</Code>. Keep your own domain fields separate from platform user data.
        </P>
        <CodeBlock language="python">{`from longlink import User, db
from sqlmodel import select

async def list_project_creators() -> list[User | None]:
    async with db.get_session() as session:
        result = await session.exec(select(Project))
        return [project.created_by for project in result.all()]`}</CodeBlock>
    </Stack>
);
