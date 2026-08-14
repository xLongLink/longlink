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
                    {'TextInput'}
                </Heading>
            </Stack>
            <Text as="p">{'Collects short text values.'}</Text>
            <Heading id="usage" level={2}>
                Usage
            </Heading>
            <CodeBlock
                code={'<TextInput label="Customer name" value="$form.name" isRequired="true" />'}
                language="xml"
            />
        </Stack>
    );
}

export const metadata = {
    path: '/docs/sdk/pages/text-input',
    title: 'TextInput',
    description: 'Collects short text values.',
    toc: [
        { id: 'introduction', label: 'Introduction', level: 1 },
        { id: 'usage', label: 'Usage', level: 2 },
    ],
    lastUpdated: '2026-07-21',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/platform/routes/Docs/Sdk/Pages/TextInput.tsx',
};

export const meta = createDocsMeta(metadata);

export default function DocsArticleRoute() {
    return (
        <DocsArticle metadata={metadata}>
            <Content />
        </DocsArticle>
    );
}
