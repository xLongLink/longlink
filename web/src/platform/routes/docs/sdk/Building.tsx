import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const article = {
    description: 'Build and package a LongLink project for deployment.',
    toc: [
        { id: 'building', label: 'Building', level: 1 },
        { id: 'metadata', label: 'Metadata', level: 2 },
    ],
    lastUpdated: '2026-09-24',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Building.tsx',
    title: 'Building Projects | LongLink Documentation',
};

export default function DocsArticleRoute() {
    return (
        <Article page={article}>
            <Stack gap={5}>
                <Heading id="building" level={1}>
                    Building
                </Heading>
                <Text as="p">
                    Package your solution into a standard container image. LongLink builds the solution together with
                    its locked dependencies, configuration requirements, and metadata.
                </Text>
                <Stack as="aside" className="border-s border-accent ps-4" gap={0}>
                    <Text weight="semibold">Why?</Text>
                    <Text as="p">
                        Get the deployment model used by modern software teams, reproducible, versioned container
                        images, without setting up and maintaining the build infrastructure yourself. Each update
                        becomes a consistent, self-contained artifact that can be deployed with a single click.
                    </Text>
                </Stack>
                <CodeBlock code="longlink build [--tag dev] [--registry localhost:15000] [--push]" language="bash" />
                <Stack gap={2}>
                    <Heading id="metadata" level={2}>
                        Metadata
                    </Heading>
                    <CodeBlock
                        code={`[project]
name = "orders"
version = "1.2.0"
description = "Order workflow service"

[tool.longlink]
environments = "src.envs:Env"
`}
                        hasLanguageLabel={false}
                        language="toml"
                        title="pyproject.toml"
                    />
                    <Table density="compact">
                        <TableHeader>
                            <TableRow>
                                <TableHeaderCell>Metadata</TableHeaderCell>
                                <TableHeaderCell>Image label</TableHeaderCell>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell>
                                    <Code>description</Code>
                                </TableCell>
                                <TableCell>
                                    <Code>org.opencontainers.image.description</Code>
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell>
                                    <Code>environments</Code>
                                </TableCell>
                                <TableCell>
                                    <Code>longlink.environments</Code>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </Stack>
            </Stack>
        </Article>
    );
}
