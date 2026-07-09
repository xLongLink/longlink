import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/database.tsx',
};

export const content = (
    <Stack>
        <Heading id="database" level="h1">
            Database
        </Heading>
        <P>
            The SDK exposes a small database API for application-owned relational data. Use <Code>db.Table</Code> to
            define SQLModel tables with LongLink audit fields, and use <Code>await db.get_session()</Code> to open an
            async database session.
        </P>
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
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch", owner="ops"))
        await session.commit()`}</CodeBlock>
        <P>After you add or change models, run migrations to keep the database schema aligned:</P>
        <Tabs defaultValue="pip">
            <TabsList>
                <TabsTrigger value="pip">pip</TabsTrigger>
                <TabsTrigger value="uv">uv</TabsTrigger>
            </TabsList>
            <TabsContent value="pip">
                <CodeBlock language="bash">longlink migrate</CodeBlock>
            </TabsContent>
            <TabsContent value="uv">
                <CodeBlock language="bash">uv run longlink migrate</CodeBlock>
            </TabsContent>
        </Tabs>
        <P>This keeps schema changes synchronized with application code.</P>
        <Accordion className="rounded-md border px-4" defaultValue={['table-fields']}>
            <AccordionItem value="table-fields">
                <AccordionTrigger>Fields Added By db.Table</AccordionTrigger>
                <AccordionContent>
                    <P>
                        Models that inherit from <Code>db.Table</Code> receive audit and soft-delete fields. Application
                        models should define their own primary key when needed; the scaffold uses normal SQLModel fields
                        for domain data.
                    </P>
                    <Ul>
                        <Li>
                            <Code>created_at</Code> and <Code>updated_at</Code> store creation and update timestamps.
                        </Li>
                        <Li>
                            <Code>deleted_at</Code> marks a row as soft-deleted instead of physically removing it.
                        </Li>
                        <Li>
                            <Code>created_id</Code>, <Code>updated_id</Code>, and <Code>deleted_id</Code> store the user
                            ids responsible for each audit event.
                        </Li>
                        <Li>
                            <Code>created_by</Code>, <Code>updated_by</Code>, and <Code>deleted_by</Code> provide
                            relationships to the shared organization users table.
                        </Li>
                    </Ul>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        <Heading id="users" level="h2">
            Users
        </Heading>
        <P>
            LongLink applications use a shared <Code>users</Code> table for audit attribution and user display data. In
            production this table lives in the organization <Code>shared</Code> schema, while application tables can
            reference it through the audit fields added by <Code>db.Table</Code>.
        </P>
        <Ul>
            <Li>
                In testing, the SDK uses an in-memory SQLite database and auto-creates the shared <Code>users</Code>
                table for application model references.
            </Li>
            <Li>
                In development, the SDK uses <Code>./dev.db</Code> without seeding local users or managing
                authentication.
            </Li>
            <Li>
                In production, the control plane manages organization users and syncs them into the organization
                database. Applications read those users; they do not own login or membership management.
            </Li>
            <Li>
                Requests proxied through the LongLink gateway include <Code>x-user-id</Code> and{' '}
                <Code>x-user-role</Code>. The SDK audit middleware reads the user id and fills create, update, and
                delete audit fields during database writes.
            </Li>
            <Li>
                Local SDK requests do not include an authenticated user by default, so audit user ids remain empty
                unless a caller explicitly supplies a trusted <Code>x-user-id</Code> header.
            </Li>
            <Li>
                Hard deletes of <Code>db.Table</Code> rows are converted into soft deletes by setting{' '}
                <Code>deleted_at</Code> and <Code>deleted_id</Code>.
            </Li>
        </Ul>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <Ul>
            <Li>
                <A href="https://github.com/fastapi/sqlmodel">SQLModel GitHub</A>
            </Li>
            <Li>
                <A href="https://sqlmodel.tiangolo.com/">SQLModel Documentation</A>
            </Li>
            <Li>
                <A href="https://github.com/sqlalchemy/sqlalchemy">SQLAlchemy GitHub</A>
            </Li>
            <Li>
                <A href="https://www.sqlalchemy.org/">SQLAlchemy Documentation</A>
            </Li>
            <Li>
                <A href="https://alembic.sqlalchemy.org/en/latest/">Alembic Documentation</A>
            </Li>
            <Li>
                <A href="https://github.com/sqlalchemy/alembic">Alembic GitHub</A>
            </Li>
        </Ul>
    </Stack>
);
