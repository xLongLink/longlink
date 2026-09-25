import { MoveRight } from 'lucide-react';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';

const article = {
    description: 'Build LongLink Solutions as standard Python and FastAPI services with the Solution SDK.',
    toc: [
        { id: 'solution-sdk', label: 'Business processes, defined as code', level: 1 },
        { id: 'create-a-solution', label: 'Create a Solution', level: 2 },
        { id: 'local-development', label: 'Local Development', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Index.tsx',
    title: 'Business processes, defined as code | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="solution-sdk" level={1}>
                    Business processes, defined as code
                </Heading>
                <Text as="p">
                    Business processes evolve over time. Requirements change, exceptions happen, and the people involved
                    may change. As information becomes fragmented, more time is spent finding data, reconstructing
                    decisions, coordinating people, and correcting mistakes.
                </Text>
                <Stack
                    className="handwritten-diagram"
                    direction="horizontal"
                    gap={6}
                    hAlign="center"
                    paddingBlock={6}
                    vAlign="center"
                    width="100%"
                >
                    <Text className="text-sm sm:text-xl md:text-2xl" hasCapsize type="display-3" weight="semibold">
                        Problem
                    </Text>
                    <MoveRight aria-hidden className="text-secondary" size={32} />
                    <Text className="text-sm sm:text-xl md:text-2xl" hasCapsize type="display-3" weight="semibold">
                        Solution
                    </Text>
                </Stack>
                <Text as="p">
                    Build dedicated tools to close this gap, using standard{' '}
                    <Link href="https://github.com/fastapi/fastapi" hasUnderline isExternalLink type="inherit">
                        FastAPI
                    </Link>{' '}
                    to structure your processes, data, rules, and workflows.
                    <br />
                    Focus on the core logic while LongLink handles the infrastructure.
                </Text>
                <Heading id="create-a-solution" level={2}>
                    Create a Solution
                </Heading>
                <CodeBlock code="uvx --from longlink longlink init --folder ." language="bash" />
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Example</Text>
                    <Link href="https://github.com/xLongLink/sample" hasUnderline isExternalLink>
                        LongLink sample repository
                    </Link>
                </Stack>
                <Heading id="local-development" level={2}>
                    Local Development
                </Heading>
                <CodeBlock code={'uv sync --group dev\nuv run longlink dev'} language="bash" />
                <Text as="p">
                    Open{' '}
                    <Link href="http://127.0.0.1:1707" hasUnderline isExternalLink type="inherit">
                        http://127.0.0.1:1707
                    </Link>{' '}
                    to preview your Solution.
                </Text>
            </Stack>
        </Article>
    );
}
