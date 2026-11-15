import { MoveRight } from 'lucide-react';
import { DocumentationArticle } from '@/components/layouts/article';
import { NativeLink as Link } from '@/components/custom/native-link';
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
                <p>
                    Business processes evolve over time. Requirements change, exceptions happen, and the people involved
                    may change. As information becomes fragmented, more time is spent finding data, reconstructing
                    decisions, coordinating people, and correcting mistakes.
                </p>
                <Stack direction="horizontal" gap={6} justify="center" paddingBlock={6} align="center" width="100%">
                    <span className="tracking-tight font-semibold block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic] text-sm sm:text-xl md:text-2xl">
                        Problem
                    </span>
                    <MoveRight aria-hidden className="text-muted-foreground" size={32} />
                    <span className="tracking-tight font-semibold block [text-box-trim:trim-both] [text-box-edge:cap_alphabetic] text-sm sm:text-xl md:text-2xl">
                        Solution
                    </span>
                </Stack>
                <p>
                    Build dedicated tools with established Python libraries: use{' '}
                    <Link href="https://github.com/fastapi/fastapi" hasUnderline isExternalLink>
                        FastAPI
                    </Link>{' '}
                    for routes,{' '}
                    <Link href="https://sqlmodel.tiangolo.com/" hasUnderline isExternalLink>
                        SQLModel
                    </Link>{' '}
                    for data, and{' '}
                    <Link href="https://docs.pydantic.dev/latest/" hasUnderline isExternalLink>
                        Pydantic
                    </Link>{' '}
                    for validation. Define your processes, rules, and workflows in Python. Focus on the core logic while
                    LongLink handles the infrastructure.
                </p>
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
                <p>
                    Open{' '}
                    <Link href="http://127.0.0.1:1707" hasUnderline isExternalLink>
                        http://127.0.0.1:1707
                    </Link>{' '}
                    to preview your Solution.
                </p>
            </Stack>
        </DocumentationArticle>
    );
}
