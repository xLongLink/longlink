import '@/components/ui/inlinecode.css';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';
import { NativeTable as Table } from '@/components/ui/NativeTable';
import { DocumentationArticle } from '@/components/layouts/Article';
import { NativeHeading as Heading } from '@/components/ui/NativeHeading';
import { NativeCodeBlock as CodeBlock } from '@/components/ui/NativeCodeBlock';

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
        <DocumentationArticle article={article}>
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
                    <Table
                        density="compact"
                        idKey="metadata"
                        data={[
                            { metadata: 'description', label: 'org.opencontainers.image.description' },
                            { metadata: 'environments', label: 'dev.longlink.environments' },
                        ]}
                        columns={[
                            {
                                key: 'metadata',
                                header: 'Metadata',
                                renderCell: (row) => <code className="inline-code">{row.metadata}</code>,
                            },
                            {
                                key: 'label',
                                header: 'Image label',
                                renderCell: (row) => <code className="inline-code">{row.label}</code>,
                            },
                        ]}
                    />
                </Stack>
            </Stack>
        </DocumentationArticle>
    );
}
