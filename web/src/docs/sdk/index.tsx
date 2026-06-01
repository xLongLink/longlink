import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-25',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/sdk/index.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>Application SDK</H1>
    <P>The LongLink SDK is a thin integration layer built on top of the standard Python backend ecosystem. It does not introduce a new framework or replace existing tools. Instead, it provides a structured way to compose and connect them within the LongLink platform.</P>
    <P>Applications follow a simple model:</P>
    <Ul>
      <Li>Business logic lives in the application code</Li>
      <Li>Structured data is stored in a relational database</Li>
      <Li>Unstructured data is stored in S3-compatible object storage</Li>
    </Ul>
    <H2>Getting Started</H2>
    <H3>Install</H3>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">pip install longlink</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv add longlink</Pre>
      </Tab>
    </Tabs>
    <H3>Initialize a Project</H3>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">longlink init</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv run longlink init</Pre>
      </Tab>
    </Tabs>
    <H2>Applications</H2>
    <P><Code>longlink init</Code> creates a minimal application scaffold:</P>
    <Pre lang="text">├── src/
│   ├── api/          # Route registration
│   ├── models/       # Database models
│   ├── pages/        # XML page definitions
│   ├── types/        # Data schemas
│   └── envs.py       # Configuration
├── tests/
│   ├── api/          # API tests
│   └── conftest.py   # Test setup
├── main.py           # Entry point
├── Dockerfile        # Container build definition
├── pyproject.toml    # Project configuration
├── .env.sample       # Environment template
├── AGENTS.md         # Platform metadata
└── README.md</Pre>
    <H2>Local Development</H2>
    <P>Install development dependencies:</P>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">pip install .[dev]</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv sync --extra dev</Pre>
      </Tab>
    </Tabs>
    <P>Run the development server:</P>
    <Tabs defaultValue="pip">
      <Tab value="pip" label="pip">
        <Pre lang="bash">longlink dev</Pre>
      </Tab>
      <Tab value="uv" label="uv">
        <Pre lang="bash">uv run longlink dev</Pre>
      </Tab>
    </Tabs>
    <H2>Resources</H2>
    <Ul>
      <Li><A href="https://github.com/fastapi/full-stack-fastapi-template/tree/master/backend">Official FastAPI Backend Template</A></Li>
    </Ul>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;
