import { Stack } from '@/components/longlink/layout/stack';
import { InlineCode } from '@/components/shadcn/inline-code';
import { DocumentationArticle } from '@/platform/layouts/documentation-article';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/longlink/display/table';
import {
    CodeBlock,
    CodeBlockCopyButton,
    CodeBlockHeader,
    CodeBlockTitle
} from '@/components/reui/code-block/code-block';

const article = {
    description: 'Build and package a LongLink project for deployment.',
    toc: [
        { id: 'building', label: 'Building', level: 1 },
        { id: 'metadata', label: 'Metadata', level: 2 }
    ],
    lastUpdated: '2026-09-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/building.tsx',
    title: 'Building Projects | LongLink Documentation'
};

export default function DocsArticleRoute() {
    return (
        <DocumentationArticle article={article}>
            <Stack gap={5}>
                <h1 className="font-semibold tracking-tight text-4xl" id="building">
                    Building
                </h1>
                <p>
                    Package your solution into a standard container image. LongLink builds the solution together with
                    its locked dependencies, configuration requirements, and metadata.
                </p>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <span className="font-semibold">Why?</span>
                    <p>
                        Get the deployment model used by modern software teams, reproducible, versioned container
                        images, without setting up and maintaining the build infrastructure yourself. Each update
                        becomes a consistent, self-contained artifact that can be deployed with a single click.
                    </p>
                </Stack>
                <CodeBlock code="longlink build [--tag dev] [--registry localhost:15000] [--push]" language="bash">
                    <CodeBlockCopyButton />
                </CodeBlock>
                <Stack gap={2}>
                    <h2 className="font-semibold tracking-tight text-3xl" id="metadata">
                        Metadata
                    </h2>
                    <CodeBlock
                        code={`[project]
name = "orders"
version = "1.2.0"
description = "Order workflow service"

[tool.longlink]
banner = "https://example.com/banner.webp"
environments = "src.envs:Env"
`}
                        language="toml"
                    >
                        <CodeBlockHeader>
                            <CodeBlockTitle>pyproject.toml</CodeBlockTitle>
                            <CodeBlockCopyButton className="ml-auto" />
                        </CodeBlockHeader>
                    </CodeBlock>
                    <Table wrap>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Metadata</TableHead>
                                <TableHead>Image label</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { metadata: 'banner (HTTPS URL)', label: 'dev.longlink.banner' },
                                { metadata: 'description', label: 'org.opencontainers.image.description' },
                                { metadata: 'environments', label: 'dev.longlink.environments' }
                            ].map((row) => (
                                <TableRow key={row.metadata}>
                                    <TableCell>
                                        <InlineCode>{row.metadata}</InlineCode>
                                    </TableCell>
                                    <TableCell>
                                        <InlineCode>{row.label}</InlineCode>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
