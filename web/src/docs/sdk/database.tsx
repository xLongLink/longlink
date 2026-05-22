import { A } from '@/components/ui/a';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the SDK database page. */
export default function SdkDatabasePage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Database</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    LongLink SDK exposes a <Code>db</Code> object for database access. You use <Code>db.Table</Code>
                    to define tables and <Code>await db.get_session()</Code> to open a session.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    The SDK keeps the database API small and explicit.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="usage" level="h2" className="text-foreground">Usage</Heading>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`from longlink import db
from pydantic import Field


class Project(db.Table):
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch", owner="ops"))
        await session.commit()`}</code>
                </pre>
                <P className="max-w-3xl text-muted-foreground">
                    After you add or change models, run migrations to keep the database schema aligned:
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`[uv]
uv run longlink migrate`}</code>
                </pre>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`[pip]
longlink migrate`}</code>
                </pre>
                <P className="max-w-3xl text-muted-foreground">
                    This keeps schema changes synchronized with application code.
                </P>
            </section>

            <section className="space-y-4">
                <Heading id="resources" level="h2" className="text-foreground">Resources</Heading>
                <Ul className="text-muted-foreground">
                    <Li><A href="https://github.com/fastapi/sqlmodel" target="_blank" rel="noopener noreferrer">SQLModel GitHub</A></Li>
                    <Li><A href="https://sqlmodel.tiangolo.com/" target="_blank" rel="noopener noreferrer">SQLModel Documentation</A></Li>
                    <Li><A href="https://github.com/sqlalchemy/sqlalchemy" target="_blank" rel="noopener noreferrer">SQLAlchemy GitHub</A></Li>
                    <Li><A href="https://www.sqlalchemy.org/" target="_blank" rel="noopener noreferrer">SQLAlchemy Documentation</A></Li>
                    <Li><A href="https://alembic.sqlalchemy.org/en/latest/" target="_blank" rel="noopener noreferrer">Alembic Documentation</A></Li>
                    <Li><A href="https://github.com/sqlalchemy/alembic" target="_blank" rel="noopener noreferrer">Alembic GitHub</A></Li>
                </Ul>
            </section>
        </article>
    );
}
