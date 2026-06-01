import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/database.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Database</H1>
    <P>LongLink SDK exposes a <Code>db</Code> object for database access. You use <Code>db.Table</Code> to define tables and <Code>await db.get_session()</Code> to open a session.</P>
    <P>The SDK keeps the database API small and explicit.</P>
    <H2>Usage</H2>
    <Pre lang="python">from longlink import db
from pydantic import Field


class Project(db.Table):
    name: str = Field(description="Project name")
    owner: str = Field(description="Project owner")


async def create_project() -> None:
    session_maker = await db.get_session()
    async with session_maker() as session:
        session.add(Project(name="Launch", owner="ops"))
        await session.commit()</Pre>
    <P>After you add or change models, run migrations to keep the database schema aligned:</P>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">longlink migrate</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv run longlink migrate</Pre>
      </Tab>
    </Tabs>
    <P>This keeps schema changes synchronized with application code.</P>
    <H2>Resources</H2>
    <Ul>
      <Li><A href="https://github.com/fastapi/sqlmodel">SQLModel GitHub</A></Li>
      <Li><A href="https://sqlmodel.tiangolo.com/">SQLModel Documentation</A></Li>
      <Li><A href="https://github.com/sqlalchemy/sqlalchemy">SQLAlchemy GitHub</A></Li>
      <Li><A href="https://www.sqlalchemy.org/">SQLAlchemy Documentation</A></Li>
      <Li><A href="https://alembic.sqlalchemy.org/en/latest/">Alembic Documentation</A></Li>
      <Li><A href="https://github.com/sqlalchemy/alembic">Alembic GitHub</A></Li>
    </Ul>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;
