import { CodeBlock } from '@/components/CodeBlock';
import { A } from '@/components/ui/a';
import { Heading } from '@/components/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/database.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="database" level="h1">
            Database
        </Heading>
        <p className="leading-7">
            LongLink SDK exposes a{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">db</code> object for
            database access. You use{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">db.Table</code> to
            define tables and{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">
                await db.get_session()
            </code>{' '}
            to open a session.
        </p>
        <p className="leading-7">The SDK keeps the database API small and explicit.</p>
        <Heading id="usage" level="h2">
            Usage
        </Heading>
        <CodeBlock language="python">{`from longlink import db
from pydantic import Field


class Project(db.Table):
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch", owner="ops"))
        await session.commit()`}</CodeBlock>
        <p className="leading-7">After you add or change models, run migrations to keep the database schema aligned:</p>
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
        <p className="leading-7">This keeps schema changes synchronized with application code.</p>
        <Heading id="resources" level="h2">
            Resources
        </Heading>
        <ul className="ml-6 list-disc space-y-2">
            <li>
                <A href="https://github.com/fastapi/sqlmodel">SQLModel GitHub</A>
            </li>
            <li>
                <A href="https://sqlmodel.tiangolo.com/">SQLModel Documentation</A>
            </li>
            <li>
                <A href="https://github.com/sqlalchemy/sqlalchemy">SQLAlchemy GitHub</A>
            </li>
            <li>
                <A href="https://www.sqlalchemy.org/">SQLAlchemy Documentation</A>
            </li>
            <li>
                <A href="https://alembic.sqlalchemy.org/en/latest/">Alembic Documentation</A>
            </li>
            <li>
                <A href="https://github.com/sqlalchemy/alembic">Alembic GitHub</A>
            </li>
        </ul>
    </div>
);
