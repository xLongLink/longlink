import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DocsArticle, createDocsMeta } from '@/platform/routes/Docs/Article';

function Content() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'Layout'}</Text>
                <Heading id="introduction" level={1}>
                    {'Table'}
                </Heading>
            </Stack>
            <Text as="p">{'Displays tabular data from an array.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    '<Table data="$orders.items">\n  <TableColumn key="number" header="Number" field="number" />\n  <TableColumn key="status" header="Status" field="status" />\n</Table>'
                }
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/table',
    title: 'Table',
    description: 'Displays tabular data from an array.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/Table.tsx',
};

export const meta = createDocsMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
