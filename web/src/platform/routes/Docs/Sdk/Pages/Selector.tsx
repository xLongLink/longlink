import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { DocsArticle, createDocsMeta } from '@/platform/routes/Docs/Article';

function Content() {
    return (
        <Stack gap={5}>
            <Stack gap={2}>
                <Text type="supporting">{'Form'}</Text>
                <Heading id="introduction" level={1}>
                    {'Selector'}
                </Heading>
            </Stack>
            <Text as="p">{'Presents a dropdown selection control.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={
                    '<Selector label="Status" value="$filters.status" hasClear="true">\n  <SelectorOption value="open" label="Open" />\n  <SelectorOption value="closed" label="Closed" />\n</Selector>'
                }
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/selector',
    title: 'Selector',
    description: 'Presents a dropdown selection control.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/Selector.tsx',
};

export const meta = createDocsMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
