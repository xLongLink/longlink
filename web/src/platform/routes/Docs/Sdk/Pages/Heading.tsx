import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DocsArticle, createDocsMeta } from '@/platform/routes/Docs/Article';

function Content() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'Content'}</Text>
                <Heading id="introduction" level={1}>
                    {'Heading'}
                </Heading>
            </Stack>
            <Text as="p">{'Creates semantic section headings.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock code={'<Heading level="1">Orders</Heading>'} language="xml" />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/heading',
    title: 'Heading',
    description: 'Creates semantic section headings.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/Heading.tsx',
};

export const meta = createDocsMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
