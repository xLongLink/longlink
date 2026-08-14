import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DocsArticle, createDocsMeta } from '@/platform/routes/Docs/Article';

function Content() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'State'}</Text>
                <Heading id="introduction" level={1}>
                    {'Query'}
                </Heading>
            </Stack>
            <Text as="p">{'Fetches JSON data before rendering and stores it in the XML runtime scope.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    '<Query id="orders" path="/api/orders" />\n\n<For each="$orders.items" as="order">\n  <Text value="$order.number" />\n</For>'
                }
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/query',
    title: 'Query',
    description: 'Fetches JSON data before rendering and stores it in the XML runtime scope.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/Query.tsx',
};

export const meta = createDocsMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
