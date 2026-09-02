import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { AppWindow, ArrowLeftRight, Code2, Database, HardDrive, Palette, PanelTop, UserRound } from 'lucide-react';

const metadata = {
    seo: {
        title: 'Solution SDK Documentation | LongLink',
        description: 'Build LongLink solutions as normal Python and FastAPI services with the Solution SDK.',
    },
    toc: [
        { id: 'solution-sdk', label: 'Solutions', level: 1 },
        { id: 'create-a-project', label: 'Create a Project', level: 2 },
        { id: 'local-development', label: 'Local Development', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Index.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="solution-sdk" level={1}>
                    Solutions
                </Heading>
                <Text as="p">
                    The LongLink SDK helps you build Solutions that work with the LongLink Platform. Your Solution stays
                    yours: it contains your data, rules, workflows, integrations, and API routes. LongLink does not
                    replace the tools you already use. A Solution is a normal FastAPI service, so you can structure and
                    run it in the way that fits your team.
                </Text>
                <Text as="p">
                    The SDK adds the parts that connect a Solution to LongLink when you need them. It can provide
                    database and storage access, identify the signed-in user, package the Solution for deployment, and
                    expose Solution Views to the LongLink control plane. Solution Views describe a Solution interface in
                    XML, so the Platform can display it consistently while the Solution continues to own the information
                    and actions behind each Solution View.
                </Text>
                <Stack direction="horizontal" gap={8} align="center" justify="center" paddingBlock={4} width="100%">
                    <Stack hAlign="end" width="calc((100% - (var(--spacing-6) * 2)) / 3)">
                        <Card width="80%" variant="muted">
                            <Stack gap={3} align="center">
                                <UserRound aria-hidden className="text-accent" size={20} />
                                <Stack align="center">
                                    <Text weight="semibold">User</Text>
                                    <Text type="supporting">Browser</Text>
                                </Stack>
                                <Stack paddingBlockEnd={3} direction="horizontal" gap={3} justify="center">
                                    <Palette aria-label="Theming" className="text-secondary" size={16} />
                                    <PanelTop aria-label="Solution shell" className="text-secondary" size={16} />
                                </Stack>
                            </Stack>
                        </Card>
                    </Stack>
                    <ArrowLeftRight aria-label="Local runtime request flow" className="text-secondary" size={16} />
                    <Stack hAlign="start" width="calc((100% - (var(--spacing-6) * 2)) / 3)">
                        <Card width="80%" variant="muted">
                            <Stack gap={3} align="center">
                                <AppWindow aria-hidden className="text-accent" size={20} />
                                <Stack align="center">
                                    <Text weight="semibold">Solution</Text>
                                    <Text type="supporting">Runtime</Text>
                                </Stack>
                                <Stack paddingBlockEnd={3} direction="horizontal" gap={3} justify="center">
                                    <Code2 aria-label="Solution logic" className="text-secondary" size={16} />
                                    <Database aria-label="Database logic" className="text-secondary" size={16} />
                                    <HardDrive aria-label="File storage" className="text-secondary" size={16} />
                                </Stack>
                            </Stack>
                        </Card>
                    </Stack>
                </Stack>
                <Heading id="create-a-project" level={2}>
                    Create a Project
                </Heading>
                <CodeBlock code={'uv add longlink\nuv run longlink init'} language="bash" />
                <Text as="p">It creates a Solution scaffold with everything you need to get started.</Text>
                <CodeBlock
                    code={
                        '├── src/                  # Solution source code\n│   ├── models/           # SQLModel solution tables\n│   ├── views/            # Solution View definitions\n│   ├── routes/           # FastAPI route modules\n│   ├── schemas/          # Pydantic request and response schemas\n│   ├── services/         # Solution services\n│   └── envs.py           # Environment settings\n├── migrations/           # Alembic solution migrations\n├── tests/                # Solution tests\n├── main.py               # Solution entry point\n├── pyproject.toml        # Project configuration\n├── .env.sample           # Environment template\n├── .gitignore\n├── AGENTS.md             # Solution agent guide\n└── README.md'
                    }
                    language="plaintext"
                />
                <Text as="p">
                    For a small working solution, see the{' '}
                    <Link href="https://github.com/xLongLink/sample" hasUnderline isExternalLink type="inherit">
                        LongLink sample repository
                    </Link>
                    .
                </Text>
                <Heading id="local-development" level={2}>
                    Local Development
                </Heading>
                <CodeBlock code={'uv sync --group dev\nuv run longlink dev'} language="bash" />
                <Text as="p">
                    Navigate to{' '}
                    <Link href="http://127.0.0.1:1707" hasUnderline isExternalLink type="inherit">
                        http://127.0.0.1:1707
                    </Link>{' '}
                    to preview your Solution.
                </Text>
            </Stack>
        </Article>
    );
}
