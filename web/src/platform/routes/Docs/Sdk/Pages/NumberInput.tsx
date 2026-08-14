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
                    {'NumberInput'}
                </Heading>
            </Stack>
            <Text as="p">{'Collects numeric values.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={'<NumberInput label="Quantity" value="$form.quantity" min="1" step="1" units="items" />'}
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/number-input',
    title: 'NumberInput',
    description: 'Collects numeric values.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/NumberInput.tsx',
};

export const meta = createDocsMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
