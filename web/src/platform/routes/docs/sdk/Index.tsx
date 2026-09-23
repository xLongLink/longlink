import { Card } from '@astryxdesign/core/Card';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { AppWindow, ArrowLeftRight, Code2, Database, HardDrive, Palette, PanelTop, UserRound } from 'lucide-react';

const article = {
    description: 'Build LongLink Solutions as standard Python and FastAPI services with the Solution SDK.',
    toc: [
        { id: 'solution-sdk', label: 'Solutions', level: 1 },
        { id: 'create-a-project', label: 'Create a Project', level: 2 },
        { id: 'local-development', label: 'Local Development', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Index.tsx',
    title: 'Solution SDK Documentation | LongLink',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="solution-sdk" level={1}>
                    Solutions
                </Heading>
                <Text as="p">
                    The LongLink SDK helps you build a Solution as a standard FastAPI project. The source stays yours,
                    including its data models, rules, workflows, integrations, and API routes. LongLink does not replace
                    the tools you already use. At runtime, the Solution runs as a FastAPI service that you can structure
                    in the way that fits your team.
                </Text>
                <Text as="p">
                    The SDK connects that service to LongLink when needed. It provides database and storage access,
                    identifies the signed-in user, packages the source for deployment, and exposes XML interfaces to the
                    LongLink control plane. These interfaces are called Views. The Platform displays each view
                    consistently while the service owns the information and actions behind it.
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
                <CodeBlock code={'uv add longlink\nuv run longlink init --folder my-solution'} language="bash" />
                <Text as="p">The command creates a project scaffold with everything needed to get started.</Text>
                <CodeBlock
                    code={
                        '├── src/\n│   ├── models/       # SQLModel database tables\n│   ├── views/        # View files\n│   ├── routes/       # API routes\n│   ├── schemas/      # Pydantic schemas\n│   └── envs.py       # Environments\n├── tests/            # Project tests\n├── .env.sample       # Environment template\n└── main.py           # Service entry point'
                    }
                    language="plaintext"
                />
                <Text as="p">
                    For a small working project, see the{' '}
                    <Link href="https://github.com/xLongLink/sample" hasUnderline isExternalLink type="inherit">
                        LongLink sample repository
                    </Link>
                    .
                </Text>
                <Heading id="local-development" level={2}>
                    Local Development
                </Heading>
                <CodeBlock code={'uv sync --group dev\nuv run longlink migrate\nuv run longlink dev'} language="bash" />
                <Text as="p">
                    Navigate to{' '}
                    <Link href="http://127.0.0.1:1707" hasUnderline isExternalLink type="inherit">
                        http://127.0.0.1:1707
                    </Link>{' '}
                    to preview the service locally.
                </Text>
            </Stack>
        </Article>
    );
}
