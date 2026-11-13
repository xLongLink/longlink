import { MoveRight } from 'lucide-react';
import { DocumentationArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
import { NativeText as Text } from '@/components/custom/native-text';
import { NativeStack as Stack } from '@/components/custom/native-stack';
import { NativeHeading as Heading } from '@/components/custom/native-heading';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/shadcn/tabs';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

const article = {
    description: 'Build LongLink Solutions as standard Python and FastAPI services with the Solution SDK.',
    toc: [
        { id: 'solution-sdk', label: 'Business processes, defined as code', level: 1 },
        { id: 'create-a-solution', label: 'Create a Solution', level: 2 },
        { id: 'local-development', label: 'Local Development', level: 2 }
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/index.tsx',
    title: 'Business processes, defined as code | LongLink Documentation'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <Heading id="solution-sdk" level={1}>
                    Business processes, defined as code
                </Heading>
                <Text as="p">
                    Business processes evolve over time. Requirements change, exceptions happen, and the people involved
                    may change. As information becomes fragmented, more time is spent finding data, reconstructing
                    decisions, coordinating people, and correcting mistakes.
                </Text>
                <Stack direction="horizontal" gap={6} justify="center" paddingBlock={6} align="center" width="100%">
                    <Text className="text-sm sm:text-xl md:text-2xl" hasCapsize type="display-3" weight="semibold">
                        Problem
                    </Text>
                    <MoveRight aria-hidden className="text-muted-foreground" size={32} />
                    <Text className="text-sm sm:text-xl md:text-2xl" hasCapsize type="display-3" weight="semibold">
                        Solution
                    </Text>
                </Stack>
                <Text as="p">
                    Build dedicated tools with established Python libraries: use{' '}
                    <Link href="https://github.com/fastapi/fastapi" hasUnderline isExternalLink type="inherit">
                        FastAPI
                    </Link>{' '}
                    for routes,{' '}
                    <Link href="https://sqlmodel.tiangolo.com/" hasUnderline isExternalLink type="inherit">
                        SQLModel
                    </Link>{' '}
                    for data, and{' '}
                    <Link href="https://docs.pydantic.dev/latest/" hasUnderline isExternalLink type="inherit">
                        Pydantic
                    </Link>{' '}
                    for validation. Define your processes, rules, and workflows in Python. Focus on the core logic while
                    LongLink handles the infrastructure.
                </Text>
                <Heading id="create-a-solution" level={2}>
                    Create a Solution
                </Heading>
                <Tabs defaultValue="github">
                    <TabsList variant="line">
                        <TabsTrigger value="github">GitHub</TabsTrigger>
                        <TabsTrigger value="standalone">Standalone</TabsTrigger>
                    </TabsList>
                    <TabsContent value="github">
                        <CodeBlock code="uvx --from longlink longlink init --folder . --ci github" language="bash">
                            <CodeBlockCopyButton />
                        </CodeBlock>
                    </TabsContent>
                    <TabsContent value="standalone">
                        <CodeBlock code="uvx --from longlink longlink init --folder ." language="bash">
                            <CodeBlockCopyButton />
                        </CodeBlock>
                    </TabsContent>
                </Tabs>
                <Heading id="local-development" level={2}>
                    Local Development
                </Heading>
                <CodeBlock code={'uv sync --group dev\nuv run longlink dev'} language="bash">
                    <CodeBlockCopyButton />
                </CodeBlock>
                <Text as="p">
                    Open{' '}
                    <Link href="http://127.0.0.1:1707" hasUnderline isExternalLink type="inherit">
                        http://127.0.0.1:1707
                    </Link>{' '}
                    to preview your Solution.
                </Text>
            </Stack>
        </DocumentationArticle>
    );
}
