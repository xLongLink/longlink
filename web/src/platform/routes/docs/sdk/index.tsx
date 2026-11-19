import { MoveRight } from 'lucide-react';
import { Link } from '@/components/longlink/action/link';
import { Stack } from '@/components/longlink/layout/stack';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
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
                <h1 className="font-semibold tracking-tight text-4xl" id="solution-sdk">
                    Business processes, defined as code
                </h1>
                <p>
                    Business processes evolve over time. Requirements change, exceptions happen, and the people involved
                    may change. As information becomes fragmented, more time is spent finding data, reconstructing
                    decisions, coordinating people, and correcting mistakes.
                </p>
                <Stack
                    direction="horizontal"
                    gap={6}
                    justify="center"
                    paddingBlock={6}
                    align="center"
                    className="w-full"
                >
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
                    <Link href="https://github.com/fastapi/fastapi" isExternalLink>
                        FastAPI
                    </Link>{' '}
                    for routes,{' '}
                    <Link href="https://sqlmodel.tiangolo.com/" isExternalLink>
                        SQLModel
                    </Link>{' '}
                    for data, and{' '}
                    <Link href="https://docs.pydantic.dev/latest/" isExternalLink>
                        Pydantic
                    </Link>{' '}
                    for validation. Define your processes, rules, and workflows in Python. Focus on the core logic while
                    LongLink handles the infrastructure.
                </p>
                <h2 className="font-semibold tracking-tight text-3xl" id="create-a-solution">
                    Create a Solution
                </h2>
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
                <h2 className="font-semibold tracking-tight text-3xl" id="local-development">
                    Local Development
                </h2>
                <CodeBlock code={'uv sync --group dev\nuv run longlink dev'} language="bash">
                    <CodeBlockCopyButton />
                </CodeBlock>
                <p>
                    Open{' '}
                    <Link href="http://127.0.0.1:1707" isExternalLink>
                        http://127.0.0.1:1707
                    </Link>{' '}
                    to preview your Solution.
                </p>
            </Stack>
        </DocumentationArticle>
    );
}
