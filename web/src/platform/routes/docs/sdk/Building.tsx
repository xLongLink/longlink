import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { Article } from '@/components/layouts/Article';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '@astryxdesign/core/Table';

const metadata = {
    seo: {
        title: 'Building Applications | LongLink Documentation',
        description: 'Build and package a LongLink application for deployment.',
    },
    toc: [
        { id: 'building', label: 'Building', level: 1 },
        { id: 'metadata', label: 'Metadata', level: 2 },
    ],
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/docs/sdk/Building.tsx',
};

export default function DocsArticleRoute() {
    return (
        <Article page={metadata}>
            <Stack gap={5}>
                <Heading id="building" level={1}>
                    Building
                </Heading>
                <Text as="p">Applications are packaged into an image and pushed to a registry.</Text>
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
environment = "src.envs:Env"
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
                                    <Code>environment</Code>
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
