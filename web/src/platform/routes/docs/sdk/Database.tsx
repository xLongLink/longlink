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
        { id: 'example', label: 'Example', level: 2 },
        { id: 'users-management', label: 'Users management', level: 2 },
        { id: 'migrations', label: 'Migrations', level: 2 },
    ],
    lastUpdated: '2026-09-29',
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
                <Heading id="example" level={2}>
                    Example
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
                <Heading id="users-management" level={2}>
                    Users management
                </Heading>
                <Text as="p">
                    The shared <Code>User</Code> has an ID, name, email, and avatar. Use <Code>Audit</Code> for
                    automatic attribution or <Code>UserRelationship()</Code> to add a named user relationship.
                </Text>
                <Text as="p">
                    <Code>Audit</Code> adds creation, update, and deletion timestamps; matching Platform user IDs; and
                    relationships to the shared users. Use it only for tables that need this history.
                </Text>
                <Text as="p">
                    <Code>UserRelationship()</Code> gives <Code>owner</Code> its own required foreign key to the shared
                    user table. Use <Code>Model</Code> instead of <Code>Audit</Code> if you do not need audit history.
                    Annotate a relationship as <Code>User | None</Code> for an optional role, such as an invoice
                    approver; its generated foreign key defaults to null.
                </Text>
                <CodeBlock
                    code={`from uuid import UUID, uuid4
from sqlmodel import Field
from longlink import Audit, Context, User, UserRelationship


class Project(Audit, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    owner: User = UserRelationship()


async def create_project(ctx: Context, owner: User) -> Project:
    """Create a project owned by an existing shared user."""

    project = Project(name="Launch", owner=owner)
    ctx.database.add(project)
    await ctx.database.flush()
    return project


# Project structure after flush:
# id: generated UUID; name: "Launch"
# owner_id: owner.id; owner: User relationship
# created_id: request actor's ID; created_by: User relationship when loaded`}
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
